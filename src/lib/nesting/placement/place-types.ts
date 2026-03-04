import type {
  NestPlacement,
  Point,
  PolygonShape,
} from '@/lib/nesting/polygon/types';

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

export interface RotationCandidateInput {
  bin: PolygonShape;
  normalizedShape: PolygonShape;
  placedParts: PlacedPartState[];
  gap: number;
  nfpCache: {
    getOrBuild: (
      key: {
        stationaryId: string;
        movingId: string;
        inside: boolean;
        stationaryRotation: number;
        movingRotation: number;
        gap: number;
      },
      builder: () => { points: Point[] }
    ) => { points: Point[] };
  };
  partId: string;
  rotation: number;
}
