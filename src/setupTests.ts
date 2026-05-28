// src/setupTests.ts
import '@testing-library/jest-dom';

// Простой синхронный мок CompressionStream для Vitest
// В тестах нам не нужно реальное сжатие — достаточно прокинуть данные "как есть"
if (typeof globalThis.CompressionStream === 'undefined') {
  class MockCompressionStream {
    private buffer: Uint8Array | null = null;
    private closed = false;
    private controller: ReadableStreamDefaultController<Uint8Array> | null =
      null;

    writable: WritableStream<Uint8Array>;
    readable: ReadableStream<Uint8Array>;

    constructor() {
      this.writable = new WritableStream<Uint8Array>({
        write: (chunk) => {
          // Сохраняем данные (в тестах без реального сжатия)
          this.buffer = new Uint8Array(chunk);
        },
        close: () => {
          this.closed = true;
          // Если контроллер уже создан — сразу отдаём данные
          if (this.controller && this.buffer) {
            this.controller.enqueue(this.buffer);
            this.controller.close();
          }
        },
      });

      this.readable = new ReadableStream<Uint8Array>({
        start: (controller) => {
          this.controller = controller;
          // Если данные уже записаны и стрим закрыт — отдаём сразу
          if (this.closed && this.buffer) {
            controller.enqueue(this.buffer);
            controller.close();
          }
        },
        pull: (controller) => {
          // Если данные появились после старта — отдаём их
          if (this.buffer) {
            controller.enqueue(this.buffer);
            this.buffer = null; // отправить только один раз
            if (this.closed) {
              controller.close();
            }
          } else if (this.closed) {
            // Стрим закрыт, данных нет — завершаем
            controller.close();
          }
          // Иначе ждём, пока pull вызовут снова
        },
      });
    }
  }

  globalThis.CompressionStream = MockCompressionStream as any;
  globalThis.DecompressionStream = MockCompressionStream as any;
}

// Подавляем отладочные логи в тестах (опционально)
if (process.env.NODE_ENV === 'test') {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const msg = args[0]?.toString?.();
    if (
      msg?.includes('[encodeProjectState]') ||
      msg?.includes('[compress]') ||
      msg?.includes('[decompress]') ||
      msg?.includes('[createProjectShareUrl]') ||
      msg?.includes('[decodeProjectState]')
    ) {
      return;
    }
    originalLog(...args);
  };
}
