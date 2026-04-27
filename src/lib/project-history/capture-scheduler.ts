type TimerId = unknown;

interface ProjectHistoryCaptureSchedulerOptions {
  delayMs: number;
  capture: () => void;
  setTimer?: (callback: () => void, delayMs: number) => TimerId;
  clearTimer?: (timerId: TimerId) => void;
}

export interface ProjectHistoryCaptureScheduler {
  schedule: () => void;
  flush: () => boolean;
  cancel: () => boolean;
  hasPending: () => boolean;
}

export const createProjectHistoryCaptureScheduler = ({
  delayMs,
  capture,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = (timerId) =>
    globalThis.clearTimeout(
      timerId as ReturnType<typeof globalThis.setTimeout>
    ),
}: ProjectHistoryCaptureSchedulerOptions): ProjectHistoryCaptureScheduler => {
  let timerId: TimerId | null = null;

  const clearPendingTimer = () => {
    if (timerId === null) {
      return false;
    }

    clearTimer(timerId);
    timerId = null;

    return true;
  };

  return {
    schedule() {
      clearPendingTimer();
      timerId = setTimer(() => {
        timerId = null;
        capture();
      }, delayMs);
    },

    flush() {
      if (!clearPendingTimer()) {
        return false;
      }

      capture();

      return true;
    },

    cancel() {
      return clearPendingTimer();
    },

    hasPending() {
      return timerId !== null;
    },
  };
};
