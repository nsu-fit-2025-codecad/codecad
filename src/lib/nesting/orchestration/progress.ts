import type { NestingProgress, PackingRunCallbacks } from '@/lib/nesting';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const createProgressEmitter = (callbacks: PackingRunCallbacks = {}) => {
  return (progress: NestingProgress) => {
    callbacks.onProgress?.({
      ...progress,
      progress: clamp01(progress.progress),
    });
  };
};
