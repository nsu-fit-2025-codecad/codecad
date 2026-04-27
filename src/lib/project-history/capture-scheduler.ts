type DefaultTimerId = ReturnType<typeof globalThis.setTimeout>;

interface ProjectHistoryCaptureSchedulerOptionsBase {
  delayMs: number;
  capture: () => void;
}

interface DefaultProjectHistoryCaptureSchedulerOptions extends ProjectHistoryCaptureSchedulerOptionsBase {
  setTimer?: undefined;
  clearTimer?: undefined;
}

interface CustomProjectHistoryCaptureSchedulerOptions<
  TimerId,
> extends ProjectHistoryCaptureSchedulerOptionsBase {
  setTimer: (callback: () => void, delayMs: number) => TimerId;
  clearTimer: (timerId: TimerId) => void;
}

type ProjectHistoryCaptureSchedulerOptions<TimerId> =
  | DefaultProjectHistoryCaptureSchedulerOptions
  | CustomProjectHistoryCaptureSchedulerOptions<TimerId>;

export interface ProjectHistoryCaptureScheduler {
  schedule: () => void;
  flush: () => boolean;
  cancel: () => boolean;
  hasPending: () => boolean;
}

const defaultSetTimer = (callback: () => void, delayMs: number) =>
  globalThis.setTimeout(callback, delayMs);

const defaultClearTimer = (timerId: DefaultTimerId) =>
  globalThis.clearTimeout(timerId);

const createScheduler = <TimerId>({
  delayMs,
  capture,
  setTimer,
  clearTimer,
}: ProjectHistoryCaptureSchedulerOptionsBase & {
  setTimer: (callback: () => void, delayMs: number) => TimerId;
  clearTimer: (timerId: TimerId) => void;
}): ProjectHistoryCaptureScheduler => {
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

export const createProjectHistoryCaptureScheduler = <TimerId = DefaultTimerId>(
  options: ProjectHistoryCaptureSchedulerOptions<TimerId>
): ProjectHistoryCaptureScheduler => {
  if (options.setTimer) {
    return createScheduler(options);
  }

  return createScheduler({
    delayMs: options.delayMs,
    capture: options.capture,
    setTimer: defaultSetTimer,
    clearTimer: defaultClearTimer,
  });
};
