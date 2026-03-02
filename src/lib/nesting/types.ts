import type { IModel } from 'makerjs';

export const NESTING_EPSILON = 1e-9;

export interface Point {
  x: number;
  y: number;
}

export type Contour = Point[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PolygonShape {
  contours: Contour[];
  bounds: Bounds;
  area: number;
}

export interface NestPart {
  id: string;
  sourceModel: IModel;
  shape: PolygonShape;
}

export interface NestPlacement {
  id: string;
  x: number;
  y: number;
  rotation: number;
  shape: PolygonShape;
}

export interface NestConfig {
  gap: number;
  rotations: number[];
  curveTolerance: number;
  searchStep?: number;
}

export interface NestResult {
  placements: NestPlacement[];
  notPlacedIds: string[];
}
