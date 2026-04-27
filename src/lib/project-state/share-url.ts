import {
  createProjectStateSnapshot,
  parseProjectStateSnapshot,
  type ProjectStateInput,
  type ProjectStateSnapshot,
} from '@/lib/project-state/contract';

export const PROJECT_STATE_QUERY_PARAM = 'project';

export type { ProjectStateInput, ProjectStateSnapshot };

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
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

export const encodeProjectState = (
  state: ProjectStateInput | ProjectStateSnapshot
) => encodeBase64Url(JSON.stringify(createProjectStateSnapshot(state)));

export const decodeProjectState = (
  payload: string
): ProjectStateSnapshot | null => {
  try {
    const parsedJson: unknown = JSON.parse(decodeBase64Url(payload));

    return parseProjectStateSnapshot(parsedJson);
  } catch {
    return null;
  }
};

export const createProjectShareUrl = (
  state: ProjectStateInput | ProjectStateSnapshot,
  href = window.location.href
) => {
  const url = new URL(href);

  url.searchParams.set(PROJECT_STATE_QUERY_PARAM, encodeProjectState(state));

  return url.toString();
};

export const readProjectStateFromUrl = (href = window.location.href) => {
  const url = new URL(href);
  const payload = url.searchParams.get(PROJECT_STATE_QUERY_PARAM);

  return payload ? decodeProjectState(payload) : null;
};

export const removeProjectStateFromUrl = (href = window.location.href) => {
  const url = new URL(href);

  url.searchParams.delete(PROJECT_STATE_QUERY_PARAM);

  return `${url.pathname}${url.search}${url.hash}`;
};
