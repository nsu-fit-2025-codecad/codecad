import { packModelsIntoTargetModel } from '@/lib/nesting';
import type {
  NestingWorkerRequest,
  NestingWorkerResponse,
} from '@/lib/nesting/worker-client';

interface WorkerScope {
  onmessage: ((event: MessageEvent<NestingWorkerRequest>) => void) | null;
  postMessage: (message: NestingWorkerResponse) => void;
}

const workerContext = self as unknown as WorkerScope;

workerContext.onmessage = (event: MessageEvent<NestingWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'run') {
    return;
  }

  try {
    const result = packModelsIntoTargetModel(
      message.model,
      message.targetModelId,
      message.options,
      {
        onProgress: (progress) => {
          const progressMessage: NestingWorkerResponse = {
            type: 'progress',
            runId: message.runId,
            progress,
          };

          workerContext.postMessage(progressMessage);
        },
      }
    );

    if (!result) {
      throw new Error('Nesting run did not produce a result.');
    }

    const doneMessage: NestingWorkerResponse = {
      type: 'result',
      runId: message.runId,
      result: {
        model: message.model,
        packedIds: Array.from(result.packedIds),
        notFitIds: Array.from(result.notFitIds),
        svgString: result.svgString,
        stats: result.stats,
      },
    };

    workerContext.postMessage(doneMessage);
  } catch (error) {
    const errorMessage: NestingWorkerResponse = {
      type: 'error',
      runId: message.runId,
      error: error instanceof Error ? error.message : 'Unknown worker error',
    };

    workerContext.postMessage(errorMessage);
  }
};

export {};
