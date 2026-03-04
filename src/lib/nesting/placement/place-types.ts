import type { NestPlacement, PolygonShape } from '@/lib/nesting/polygon/types';

export interface PlacementScore {
  area: number;
  width: number;
  height: number;
  y: number;
  x: number;
}

export interface PlacementCandidate {
  placement: NestPlacement;
  score: PlacementScore;
  rotationIndex: number;
}

export interface HoleRegion {
  id: string;
  shape: PolygonShape;
}

export interface PlacedPartState {
  id: string;
  x: number;
  y: number;
  rotation: number;
  normalizedShape: PolygonShape;
  holeRegions: HoleRegion[];
  shape: PolygonShape;
}
