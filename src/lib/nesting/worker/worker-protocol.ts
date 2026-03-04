import type { IModel } from 'makerjs';
import type {
  NestingProgress,
  NestingRunStats,
  PackingOptions,
} from '@/lib/nesting';

export interface NestingWorkerRunRequest {
  type: 'run';
  runId: string;
  model: IModel;
  targetModelId: string;
  options: PackingOptions;
}

export interface NestingWorkerProgressMessage {
  type: 'progress';
  runId: string;
  progress: NestingProgress;
}

export interface NestingWorkerResultPayload {
  model: IModel;
  packedIds: string[];
  notFitIds: string[];
  svgString: string;
  stats: NestingRunStats;
}

export interface NestingWorkerResultMessage {
  type: 'result';
  runId: string;
  result: NestingWorkerResultPayload;
}

export interface NestingWorkerErrorMessage {
  type: 'error';
  runId: string;
  error: string;
}

export type NestingWorkerRequest = NestingWorkerRunRequest;
export type NestingWorkerResponse =
  | NestingWorkerProgressMessage
  | NestingWorkerResultMessage
  | NestingWorkerErrorMessage;
