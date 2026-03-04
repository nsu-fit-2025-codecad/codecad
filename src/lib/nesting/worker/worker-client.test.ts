import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IModel } from 'makerjs';
import {
  NESTING_RUN_CANCELLED_MESSAGE,
  NestingWorkerClient,
} from '@/lib/nesting/worker/worker-client';
import type { NestingWorkerResponse } from '@/lib/nesting/worker/worker-client';

let onPostMessage: ((worker: MockWorker, message: unknown) => void) | null =
  null;

class MockWorker {
  public onmessage:
    | ((event: MessageEvent<NestingWorkerResponse>) => void)
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

  emitMessage(message: NestingWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<NestingWorkerResponse>);
  }
}

describe('NestingWorkerClient', () => {
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

  it('streams progress and resolves with packed id sets', async () => {
    const progressSpy = vi.fn();
    const client = new NestingWorkerClient();
    const runPromise = client.run({
      model: {} as IModel,
      targetModelId: 'target',
      options: { gap: 0 },
      onProgress: progressSpy,
    });

    const worker = mockWorkers[0];
    const request = worker.requests[0] as { runId: string };

    worker.emitMessage({
      type: 'progress',
      runId: request.runId,
      progress: {
        phase: 'preparing',
        progress: 0.5,
        message: 'Preparing',
      },
    });
    worker.emitMessage({
      type: 'result',
      runId: request.runId,
      result: {
        model: {} as IModel,
        packedIds: ['a', 'b'],
        notFitIds: ['c'],
        svgString: '<svg/>',
        stats: {
          algorithm: 'genetic',
          placedCount: 2,
          notFitCount: 1,
          durationMs: 12,
          fitness: {
            unplacedCount: 1,
            binsUsed: 1,
            compactness: 100,
            width: 10,
            height: 10,
          },
          evaluations: 16,
        },
      },
    });

    const result = await runPromise;

    expect(progressSpy).toHaveBeenCalledTimes(1);
    expect(result.packedIds.has('a')).toBe(true);
    expect(result.packedIds.has('b')).toBe(true);
    expect(result.notFitIds.has('c')).toBe(true);
    expect(result.stats.algorithm).toBe('genetic');
  });

  it('prevents duplicate runs while one is active', () => {
    const client = new NestingWorkerClient();

    client.run({
      model: {} as IModel,
      targetModelId: 'target',
      options: {},
    });

    expect(() =>
      client.run({
        model: {} as IModel,
        targetModelId: 'target',
        options: {},
      })
    ).toThrow('Nesting run already in progress.');
  });

  it('cancels an active run and allows a follow-up run', async () => {
    const client = new NestingWorkerClient();
    const runPromise = client.run({
      model: {} as IModel,
      targetModelId: 'target',
      options: {},
    });

    const firstWorker = mockWorkers[0];
    expect(client.cancelRun()).toBe(true);
    expect(firstWorker.terminated).toBe(true);
    await expect(runPromise).rejects.toThrow(NESTING_RUN_CANCELLED_MESSAGE);

    const nextRunPromise = client.run({
      model: {} as IModel,
      targetModelId: 'target',
      options: {},
    });

    const secondWorker = mockWorkers[1];
    const request = secondWorker.requests[0] as { runId: string };
    secondWorker.emitMessage({
      type: 'result',
      runId: request.runId,
      result: {
        model: {} as IModel,
        packedIds: [],
        notFitIds: [],
        svgString: '<svg/>',
        stats: {
          algorithm: 'deterministic',
          placedCount: 0,
          notFitCount: 0,
          durationMs: 1,
          fitness: {
            unplacedCount: 0,
            binsUsed: 1,
            compactness: 0,
            width: 0,
            height: 0,
          },
        },
      },
    });

    await expect(nextRunPromise).resolves.toMatchObject({
      svgString: '<svg/>',
    });
  });

  it('clears pendingRun when postMessage throws synchronously', async () => {
    const client = new NestingWorkerClient();
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
        model: {} as IModel,
        targetModelId: 'target',
        options: {},
      })
    ).rejects.toThrow('DataCloneError');

    const secondRunPromise = client.run({
      model: {} as IModel,
      targetModelId: 'target',
      options: {},
    });
    const worker = mockWorkers[0];
    const secondRequest = worker.requests[0] as { runId: string };

    worker.emitMessage({
      type: 'result',
      runId: secondRequest.runId,
      result: {
        model: {} as IModel,
        packedIds: [],
        notFitIds: [],
        svgString: '<svg/>',
        stats: {
          algorithm: 'deterministic',
          placedCount: 0,
          notFitCount: 0,
          durationMs: 1,
          fitness: {
            unplacedCount: 0,
            binsUsed: 1,
            compactness: 0,
            width: 0,
            height: 0,
          },
        },
      },
    });

    await expect(secondRunPromise).resolves.toMatchObject({
      svgString: '<svg/>',
    });
  });
});
