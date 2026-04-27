import type { PackingRunCallbacks } from '@/lib/nesting';
import type {
  EngineExecutionResult,
  NormalizedPackingOptions,
  PreparedNestInput,
} from '@/lib/nesting/orchestration/runtime-types';

export interface AsyncNestingSolverAdapter {
  execute: (
    prepared: PreparedNestInput,
    options: NormalizedPackingOptions,
    callbacks?: PackingRunCallbacks
  ) => Promise<EngineExecutionResult>;
}
