import type { NestPart } from '@/lib/nesting/polygon/types';
import type {
  GeneticDecision,
  NormalizedPackingOptions,
} from '@/lib/nesting/orchestration/runtime-types';

export const decideGeneticExecution = (
  parts: NestPart[],
  options: NormalizedPackingOptions
): GeneticDecision => {
  if (!options.useGeneticSearch) {
    return {
      mode: 'disabled',
      reason: 'disabled_by_option',
    };
  }

  if (parts.length <= 2) {
    return {
      mode: 'disabled',
      reason: 'too_few_parts',
    };
  }

  return {
    mode: 'enabled',
    reason: 'eligible',
  };
};
