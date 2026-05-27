import type {
  CadEvaluationWorkerRequest,
  CadEvaluationWorkerResponse,
  CadEvaluationWorkerRunRequest,
  CadEvaluationWorkerResultPayload,
} from '@/lib/cad/worker/worker-protocol';
import type { EditorEvaluationError } from '@/lib/editor-recovery';
import type { Parameter } from '@/store/store';

export type {
  CadEvaluationWorkerRequest,
  CadEvaluationWorkerResponse,
} from '@/lib/cad/worker/worker-protocol';

export interface RunCadEvaluationInWorkerInput {
  sourceCode: string;
  parameters: readonly Parameter[];
}

interface PendingRun {
  runId: string;
  resolve: (value: CadEvaluationWorkerResultPayload) => void;
  reject: (error: EditorEvaluationError) => void;
}

export const CAD_EVALUATION_CANCELLED_MESSAGE = 'CAD evaluation run cancelled.';

const createCadEvaluationError = (message: string): EditorEvaluationError => ({
  message,
});

export class CadEvaluationWorkerClient {
  private worker: Worker | null = null;
  private pendingRun: PendingRun | null = null;
  private runSequence = 0;

  private ensureWorker = () => {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(
      new URL('../../../workers/cad-evaluation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<CadEvaluationWorkerResponse>) => {
      this.handleMessage(event.data);
    };

    worker.onerror = () => {
      this.rejectPendingRun(createCadEvaluationError('CAD worker crashed.'));
      this.worker?.terminate();
      this.worker = null;
    };

    this.worker = worker;
    return worker;
  };

  run = (input: RunCadEvaluationInWorkerInput) => {
    if (this.pendingRun) {
      this.cancelRun();
    }

    const worker = this.ensureWorker();
    const runId = `cad-eval-${Date.now()}-${this.runSequence + 1}`;
    this.runSequence += 1;

    return new Promise<CadEvaluationWorkerResultPayload>((resolve, reject) => {
      this.pendingRun = {
        runId,
        resolve,
        reject,
      };

      const request: CadEvaluationWorkerRunRequest = {
        type: 'run',
        runId,
        sourceCode: input.sourceCode,
        parameters: input.parameters.map((parameter) => ({ ...parameter })),
      };

      try {
        worker.postMessage(request satisfies CadEvaluationWorkerRequest);
      } catch (error) {
        this.rejectPendingRun(
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : createCadEvaluationError('Failed to post message to CAD worker.')
        );
      }
    });
  };

  cancelRun = (reason = CAD_EVALUATION_CANCELLED_MESSAGE) => {
    if (!this.pendingRun) {
      return false;
    }

    this.rejectPendingRun(createCadEvaluationError(reason));
    this.worker?.terminate();
    this.worker = null;
    return true;
  };

  dispose = () => {
    this.rejectPendingRun(createCadEvaluationError('CAD worker disposed.'));
    this.worker?.terminate();
    this.worker = null;
  };

  private handleMessage = (message: CadEvaluationWorkerResponse) => {
    if (!this.pendingRun || message.runId !== this.pendingRun.runId) {
      return;
    }

    if (message.type === 'error') {
      this.rejectPendingRun(message.error);
      return;
    }

    this.pendingRun.resolve(message.result);
    this.pendingRun = null;
  };

  private rejectPendingRun = (error: EditorEvaluationError) => {
    if (!this.pendingRun) {
      return;
    }

    this.pendingRun.reject(error);
    this.pendingRun = null;
  };
}
