import { evaluateCadSource } from '@/lib/cad/evaluation';
import { createEditorEvaluationError } from '@/lib/editor-recovery';
import type {
  CadEvaluationWorkerRequest,
  CadEvaluationWorkerResponse,
} from '@/lib/cad/worker/worker-protocol';

interface WorkerScope {
  onmessage: ((event: MessageEvent<CadEvaluationWorkerRequest>) => void) | null;
  postMessage: (message: CadEvaluationWorkerResponse) => void;
}

const workerContext = self as WorkerScope;

workerContext.onmessage = (event: MessageEvent<CadEvaluationWorkerRequest>) => {
  const message = event.data;

  if (message.type !== 'run') {
    return;
  }

  try {
    const result = evaluateCadSource({
      sourceCode: message.sourceCode,
      parameters: message.parameters,
    });

    workerContext.postMessage({
      type: 'result',
      runId: message.runId,
      result,
    });
  } catch (error) {
    workerContext.postMessage({
      type: 'error',
      runId: message.runId,
      error: createEditorEvaluationError(error),
    });
  }
};

export {};
