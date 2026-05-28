import {
  encode as msgpackEncode,
  decode as msgpackDecode,
} from '@msgpack/msgpack';
import {
  PROJECT_STATE_VERSION,
  createProjectStateSnapshot,
  parseProjectStateSnapshot,
  projectStateInputSchema,
  type ProjectStateInput,
  type ProjectStateSnapshot,
} from '@/lib/project-state/contract';

export const PROJECT_STATE_QUERY_PARAM = 'project';
const PAYLOAD_FORMAT_VERSION = 2;

export type { ProjectStateInput, ProjectStateSnapshot };

// === Base64URL utilities ===
export const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

export const decodeBase64Url = (value: string) => {
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0))
  );
};

// === Compression helpers (надёжная версия с параллельным чтением) ===
const compress = async (data: Uint8Array): Promise<Uint8Array> => {
  try {
    console.log('[compress] starting, input size:', data.length);

    const cs = new CompressionStream('deflate');

    // Начинаем читать СРАЗУ, пока пишем (параллельно)
    const readPromise = (async () => {
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[compress] read stream done');
          break;
        }
        if (value) {
          console.log('[compress] read chunk, size:', value.length);
          chunks.push(value);
        }
      }

      // Собираем результат
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      console.log('[compress] assembled result, size:', totalLength);
      return result;
    })();

    // Пишем данные
    const writer = cs.writable.getWriter();
    // eslint-disable-next-line no-undef
    await writer.write(data as BufferSource);
    console.log('[compress] wrote data to stream');

    // Закрываем стрим — это сигнал для читера, что данных больше не будет
    await writer.close();
    console.log('[compress] closed writer');

    // Ждём, пока читер дочитает всё
    const result = await readPromise;
    console.log('[compress] done, output size:', result.length);
    return result;
  } catch (err) {
    console.error('[compress] error, falling back to raw:', err);
    // Fallback: возвращаем данные без сжатия, чтобы не ломать функционал
    return data;
  }
};

const decompress = async (data: Uint8Array): Promise<Uint8Array> => {
  try {
    const ds = new DecompressionStream('deflate');

    const readPromise = (async () => {
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      return result;
    })();

    const writer = ds.writable.getWriter();
    // eslint-disable-next-line no-undef
    await writer.write(data as BufferSource);
    await writer.close();

    return await readPromise;
  } catch (err) {
    console.error('[decompress] error:', err);
    throw err;
  }
};

// === Encoding/Decoding ===
export const encodeProjectState = async (
  state: ProjectStateInput | ProjectStateSnapshot
): Promise<string> => {
  console.log('[encodeProjectState] start');

  try {
    const snapshot = createProjectStateSnapshot(state);
    console.log('[encodeProjectState] snapshot created');

    const msgpackBytes = msgpackEncode(snapshot);
    console.log(
      '[encodeProjectState] msgpack encoded, size:',
      msgpackBytes.length
    );

    const compressed = await compress(msgpackBytes);
    console.log('[encodeProjectState] compressed, size:', compressed.length);

    const payload = new Uint8Array(1 + compressed.length);
    payload[0] = PAYLOAD_FORMAT_VERSION;
    payload.set(compressed, 1);

    let binary = '';
    payload.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    const result = btoa(binary)
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');

    console.log('[encodeProjectState] done, final length:', result.length);
    return result;
  } catch (err) {
    console.error('[encodeProjectState] error:', err);
    throw err;
  }
};

export const decodeProjectState = async (
  payload: string
): Promise<ProjectStateSnapshot | null> => {
  try {
    let rawBytes: Uint8Array;
    try {
      rawBytes = Uint8Array.from(
        atob(
          payload
            .replaceAll('-', '+')
            .replaceAll('_', '/')
            .padEnd(Math.ceil(payload.length / 4) * 4, '=')
        ),
        (char) => char.charCodeAt(0)
      );
    } catch {
      return null;
    }

    const formatVersion = rawBytes[0];

    if (formatVersion === PAYLOAD_FORMAT_VERSION) {
      // === НОВЫЙ ФОРМАТ: добавляем логи ===
      console.log('[decode:NEW] payload length:', payload.length);
      console.log('[decode:NEW] rawBytes length:', rawBytes.length);

      const compressed = rawBytes.slice(1);
      console.log('[decode:NEW] compressed length:', compressed.length);

      const decompressed = await decompress(compressed);
      console.log('[decode:NEW] decompressed length:', decompressed.length);
      console.log(
        '[decode:NEW] decompressed (first 50 bytes):',
        Array.from(decompressed.slice(0, 50))
      );

      const parsed = msgpackDecode(decompressed) as unknown;
      console.log('[decode:NEW] msgpackDecode result type:', typeof parsed);
      console.log('[decode:NEW] msgpackDecode result:', parsed);

      const cleaned = replaceNullWithUndefined(parsed);

      const validated = parseProjectStateSnapshot(cleaned);
      console.log(
        '[decode:NEW] Zod validation result:',
        validated ? '✓ valid' : '✗ null'
      );

      return validated;
      // === Конец логов ===
    } else {
      // Старый формат
      try {
        const jsonStr = decodeBase64Url(payload);
        const parsedJson: unknown = JSON.parse(jsonStr);

        if (typeof parsedJson === 'object' && parsedJson !== null) {
          // Проверяем версию через 'in' — надёжнее, чем ?.version
          if (
            'version' in parsedJson &&
            parsedJson.version !== PROJECT_STATE_VERSION
          ) {
            return null;
          }
        }

        const result = projectStateInputSchema.safeParse(parsedJson);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    }
  } catch (err) {
    console.error('[decodeProjectState] unexpected error:', err);
    return null;
  }
};

// === Public API ===
export const createProjectShareUrl = async (
  state: ProjectStateInput | ProjectStateSnapshot,
  href = window.location.href
): Promise<string> => {
  console.log('[createProjectShareUrl] start');
  const url = new URL(href);
  const encoded = await encodeProjectState(state);
  url.searchParams.set(PROJECT_STATE_QUERY_PARAM, encoded);
  console.log('[createProjectShareUrl] done:', url.toString());
  return url.toString();
};

export const readProjectStateFromUrl = async (
  href = window.location.href
): Promise<ProjectStateSnapshot | null> => {
  const url = new URL(href);
  const payload = url.searchParams.get(PROJECT_STATE_QUERY_PARAM);
  return payload ? await decodeProjectState(payload) : null;
};

export const removeProjectStateFromUrl = (href = window.location.href) => {
  const url = new URL(href);
  url.searchParams.delete(PROJECT_STATE_QUERY_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
};

// === Вспомогательная функция: null → undefined (рекурсивно) ===
const replaceNullWithUndefined = (value: unknown): unknown => {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(replaceNullWithUndefined);
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = replaceNullWithUndefined(val);
    }
    return result;
  }
  return value;
};
