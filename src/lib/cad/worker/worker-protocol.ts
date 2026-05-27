import type { IModel } from 'makerjs';
import type { Parameter } from '@/store/store';
import type { Model } from '@/store/models-store';
import type { EditorEvaluationError } from '@/lib/editor-recovery';

export interface CadEvaluationWorkerRunRequest {
  type: 'run';
  runId: string;
  sourceCode: string;
  parameters: Parameter[];
}

export interface CadEvaluationWorkerResultPayload {
  model: IModel;
  modelSizes: Model[];
  svgString: string;
}

export interface CadEvaluationWorkerResultMessage {
  type: 'result';
  runId: string;
  result: CadEvaluationWorkerResultPayload;
}

export interface CadEvaluationWorkerErrorMessage {
  type: 'error';
  runId: string;
  error: EditorEvaluationError;
}

export type CadEvaluationWorkerRequest = CadEvaluationWorkerRunRequest;
export type CadEvaluationWorkerResponse =
  | CadEvaluationWorkerResultMessage
  | CadEvaluationWorkerErrorMessage;
