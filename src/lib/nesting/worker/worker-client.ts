import type { IModel } from 'makerjs';
import type {
  NestingProgress,
  NestingRunStats,
  PackingOptions,
} from '@/lib/nesting';
import type {
  NestingWorkerResponse,
  NestingWorkerRunRequest,
} from '@/lib/nesting/worker/worker-protocol';
export type {
  NestingWorkerRequest,
  NestingWorkerResponse,
} from '@/lib/nesting/worker/worker-protocol';

export interface RunNestingInWorkerInput {
  model: IModel;
  targetModelId: string;
  options: PackingOptions;
  onProgress?: (progress: NestingProgress) => void;
}

export interface RunNestingInWorkerResult {
  model: IModel;
  packedIds: Set<string>;
  notFitIds: Set<string>;
  svgString: string;
  stats: NestingRunStats;
}

interface PendingRun {
  runId: string;
  onProgress?: (progress: NestingProgress) => void;
  resolve: (value: RunNestingInWorkerResult) => void;
  reject: (error: Error) => void;
}

export const NESTING_RUN_CANCELLED_MESSAGE = 'Nesting run cancelled.';

export class NestingWorkerClient {
  private worker: Worker | null = null;
  private pendingRun: PendingRun | null = null;
  private runSequence = 0;

  private ensureWorker = () => {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(
      new URL('../../../workers/nesting.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<NestingWorkerResponse>) => {
      this.handleMessage(event.data);
    };

    worker.onerror = () => {
      this.rejectPendingRun(new Error('Nesting worker crashed.'));
      this.worker?.terminate();
      this.worker = null;
    };

    this.worker = worker;
    return worker;
  };

  run = (input: RunNestingInWorkerInput) => {
    if (this.pendingRun) {
      throw new Error('Nesting run already in progress.');
    }

    const worker = this.ensureWorker();
    const runId = `nest-${Date.now()}-${this.runSequence + 1}`;
    this.runSequence += 1;

    return new Promise<RunNestingInWorkerResult>((resolve, reject) => {
      this.pendingRun = {
        runId,
        onProgress: input.onProgress,
        resolve,
        reject,
      };

      const request: NestingWorkerRunRequest = {
        type: 'run',
        runId,
        model: input.model,
        targetModelId: input.targetModelId,
        options: input.options,
      };

      try {
        worker.postMessage(request);
      } catch (error) {
        this.rejectPendingRun(
          error instanceof Error
            ? error
            : new Error('Failed to post message to nesting worker.')
        );
      }
    });
  };

  cancelRun = (reason = NESTING_RUN_CANCELLED_MESSAGE) => {
    if (!this.pendingRun) {
      return false;
    }

    this.rejectPendingRun(new Error(reason));
    this.worker?.terminate();
    this.worker = null;
    return true;
  };

  dispose = () => {
    this.rejectPendingRun(new Error('Nesting worker disposed.'));
    this.worker?.terminate();
    this.worker = null;
  };

  private handleMessage = (message: NestingWorkerResponse) => {
    if (!this.pendingRun || message.runId !== this.pendingRun.runId) {
      return;
    }

    if (message.type === 'progress') {
      this.pendingRun.onProgress?.(message.progress);
      return;
    }

    if (message.type === 'error') {
      this.rejectPendingRun(new Error(message.error));
      return;
    }

    this.pendingRun.resolve({
      model: message.result.model,
      packedIds: new Set(message.result.packedIds),
      notFitIds: new Set(message.result.notFitIds),
      svgString: message.result.svgString,
      stats: message.result.stats,
    });
    this.pendingRun = null;
  };

  private rejectPendingRun = (error: Error) => {
    if (!this.pendingRun) {
      return;
    }

    this.pendingRun.reject(error);
    this.pendingRun = null;
  };
}
