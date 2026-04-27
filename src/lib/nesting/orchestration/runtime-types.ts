import makerjs, { IModel, IModelMap } from 'makerjs';
import type {
  NestPart,
  NestResult,
  PolygonShape,
} from '@/lib/nesting/polygon/types';
import type {
  NestingAlgorithm,
  NestingRunStats,
  PackingOptions,
} from '@/lib/nesting';

export interface NormalizedPackingOptions extends Omit<
  PackingOptions,
  | 'gap'
  | 'allowRotation'
  | 'rotationCount'
  | 'rotations'
  | 'curveTolerance'
  | 'populationSize'
  | 'maxGenerations'
  | 'mutationRate'
  | 'crossoverRate'
  | 'eliteCount'
  | 'useGeneticSearch'
  | 'nestingEngine'
> {
  nestingEngine: NonNullable<PackingOptions['nestingEngine']>;
  gap: number;
  allowRotation: boolean;
  rotationCount?: number;
  rotations: number[];
  curveTolerance: number;
  useGeneticSearch: boolean;
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  eliteCount: number;
}

export type GeneticExecutionMode = 'disabled' | 'enabled';

export interface GeneticDecision {
  mode: GeneticExecutionMode;
  reason?: 'disabled_by_option' | 'too_few_parts' | 'eligible';
}

export interface PreparedNestInput {
  nestingArea: IModel;
  nestingShape: PolygonShape;
  nestingExtents: makerjs.IMeasure;
  parts: NestPart[];
  invalidModels: IModelMap;
  sourceModel: IModel;
  targetModelId: string;
}

export interface AssembledNestResult {
  packedModels: IModelMap;
  didNotFitModels: IModelMap;
}

export interface EngineExecutionResult {
  algorithm: NestingAlgorithm;
  placementResult: NestResult;
  statsExtras: Partial<NestingRunStats>;
}

export interface NestAssemblyContext {
  prepared: PreparedNestInput;
  placementResult: NestResult;
}
