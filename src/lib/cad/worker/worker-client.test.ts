import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IModel } from 'makerjs';
import {
  CAD_EVALUATION_CANCELLED_MESSAGE,
  CadEvaluationWorkerClient,
} from '@/lib/cad/worker/worker-client';
import type { CadEvaluationWorkerResponse } from '@/lib/cad/worker/worker-client';

let onPostMessage: ((worker: MockWorker, message: unknown) => void) | null =
  null;

class MockWorker {
  public onmessage:
    | ((event: MessageEvent<CadEvaluationWorkerResponse>) => void)
    | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public requests: unknown[] = [];
  public terminated = false;

  postMessage(message: unknown) {
    if (onPostMessage) {
      onPostMessage(this, message);
      return;
    }

    this.requests.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(message: CadEvaluationWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<CadEvaluationWorkerResponse>);
  }
}

describe('CadEvaluationWorkerClient', () => {
  const OriginalWorker = globalThis.Worker;
  const mockWorkers: MockWorker[] = [];

  beforeEach(() => {
    mockWorkers.length = 0;
    onPostMessage = null;

    class WorkerStub extends MockWorker {
      constructor() {
        super();
        mockWorkers.push(this);
      }
    }

    globalThis.Worker = WorkerStub as unknown as typeof Worker;
  });

  afterEach(() => {
    onPostMessage = null;
    globalThis.Worker = OriginalWorker;
  });

  it('resolves with the latest CAD evaluation result', async () => {
    const client = new CadEvaluationWorkerClient();
    const runPromise = client.run({
      sourceCode: 'return cad.rect(10, 20);',
      parameters: [],
    });

    const worker = mockWorkers[0];
    const request = worker.requests[0] as { runId: string };

    worker.emitMessage({
      type: 'result',
      runId: request.runId,
      result: {
        model: {} as IModel,
        modelSizes: [{ id: 'plate', width: 10, height: 20 }],
        svgString: '<svg/>',
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      svgString: '<svg/>',
      modelSizes: [{ id: 'plate', width: 10, height: 20 }],
    });
  });

  it('cancels an active run before starting the next one', async () => {
    const client = new CadEvaluationWorkerClient();
    const firstRunPromise = client.run({
      sourceCode: 'return cad.rect(10, 20);',
      parameters: [],
    });
    const firstWorker = mockWorkers[0];

    const secondRunPromise = client.run({
      sourceCode: 'return cad.rect(30, 40);',
      parameters: [],
    });

    expect(firstWorker.terminated).toBe(true);
    await expect(firstRunPromise).rejects.toMatchObject({
      message: CAD_EVALUATION_CANCELLED_MESSAGE,
    });

    const secondWorker = mockWorkers[1];
    const secondRequest = secondWorker.requests[0] as { runId: string };

    secondWorker.emitMessage({
      type: 'result',
      runId: secondRequest.runId,
      result: {
        model: {} as IModel,
        modelSizes: [{ id: 'next', width: 30, height: 40 }],
        svgString: '<svg id="next"/>',
      },
    });

    await expect(secondRunPromise).resolves.toMatchObject({
      svgString: '<svg id="next"/>',
    });
  });

  it('ignores stale worker responses with another run id', async () => {
    const client = new CadEvaluationWorkerClient();
    const runPromise = client.run({
      sourceCode: 'return cad.rect(10, 20);',
      parameters: [],
    });

    const worker = mockWorkers[0];
    const request = worker.requests[0] as { runId: string };

    worker.emitMessage({
      type: 'result',
      runId: 'stale-run',
      result: {
        model: {} as IModel,
        modelSizes: [],
        svgString: '<svg id="stale"/>',
      },
    });
    worker.emitMessage({
      type: 'result',
      runId: request.runId,
      result: {
        model: {} as IModel,
        modelSizes: [],
        svgString: '<svg id="fresh"/>',
      },
    });

    await expect(runPromise).resolves.toMatchObject({
      svgString: '<svg id="fresh"/>',
    });
  });

  it('clears pending runs when postMessage throws synchronously', async () => {
    const client = new CadEvaluationWorkerClient();
    let failPostMessage = true;

    onPostMessage = (worker, message) => {
      if (failPostMessage) {
        failPostMessage = false;
        throw new Error('DataCloneError');
      }

      worker.requests.push(message);
    };

    await expect(
      client.run({
        sourceCode: 'return cad.rect(10, 20);',
        parameters: [],
      })
    ).rejects.toMatchObject({ message: 'DataCloneError' });

    const nextRunPromise = client.run({
      sourceCode: 'return cad.rect(30, 40);',
      parameters: [],
    });
    const worker = mockWorkers[0];
    const request = worker.requests[0] as { runId: string };

    worker.emitMessage({
      type: 'result',
      runId: request.runId,
      result: {
        model: {} as IModel,
        modelSizes: [],
        svgString: '<svg/>',
      },
    });

    await expect(nextRunPromise).resolves.toMatchObject({
      svgString: '<svg/>',
    });
  });
});
