import { rotateShape, translateShape } from '@/lib/nesting/polygon-math';
import type { PolygonShape } from '@/lib/nesting/types';

const ROTATION_EPSILON = 1e-6;
export const MIN_ROTATION_COUNT = 1;
export const MAX_ROTATION_COUNT = 16;
export const DEFAULT_ROTATION_COUNT = 4;

export interface RotationSelectionInput {
  rotationCount?: number;
  rotations?: number[];
  allowRotation?: boolean;
}

export interface RotationSelection {
  rotationCount: number | null;
  displayRotationCount: number;
  rotations: number[];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeRotation = (rotation: number): number => {
  const mod = rotation % 360;
  const normalized = mod >= 0 ? mod : mod + 360;
  return Math.round(normalized / ROTATION_EPSILON) * ROTATION_EPSILON;
};

export const normalizeRotations = (rotations: number[]): number[] => {
  if (rotations.length === 0) {
    return [0];
  }

  return Array.from(new Set(rotations.map(normalizeRotation))).sort(
    (a, b) => a - b
  );
};

export const normalizeRotationCount = (
  rotationCount: number | undefined,
  fallback = DEFAULT_ROTATION_COUNT
) => {
  const normalizedFallback = clamp(
    Math.round(fallback),
    MIN_ROTATION_COUNT,
    MAX_ROTATION_COUNT
  );

  if (typeof rotationCount !== 'number' || !Number.isFinite(rotationCount)) {
    return normalizedFallback;
  }

  return clamp(
    Math.round(rotationCount),
    MIN_ROTATION_COUNT,
    MAX_ROTATION_COUNT
  );
};

export const rotationCountToAngles = (rotationCount: number): number[] => {
  const normalizedCount = normalizeRotationCount(rotationCount);
  const step = 360 / normalizedCount;

  return normalizeRotations(
    Array.from({ length: normalizedCount }, (_, index) => index * step)
  );
};

const inferRotationCountFromRotations = (
  rotations: number[]
): number | null => {
  for (
    let count = MIN_ROTATION_COUNT;
    count <= MAX_ROTATION_COUNT;
    count += 1
  ) {
    const expected = rotationCountToAngles(count);

    if (expected.length !== rotations.length) {
      continue;
    }

    const matches = expected.every(
      (angle, index) => Math.abs(angle - rotations[index]) <= ROTATION_EPSILON
    );

    if (matches) {
      return count;
    }
  }

  return null;
};

export const resolveRotationSelection = ({
  rotationCount,
  rotations,
  allowRotation = true,
}: RotationSelectionInput): RotationSelection => {
  if (!allowRotation) {
    return {
      rotationCount: MIN_ROTATION_COUNT,
      displayRotationCount: MIN_ROTATION_COUNT,
      rotations: [0],
    };
  }

  if (typeof rotationCount === 'number' && Number.isFinite(rotationCount)) {
    const normalizedCount = normalizeRotationCount(
      rotationCount,
      DEFAULT_ROTATION_COUNT
    );

    return {
      rotationCount: normalizedCount,
      displayRotationCount: normalizedCount,
      rotations: rotationCountToAngles(normalizedCount),
    };
  }

  const normalizedRotations = Array.isArray(rotations)
    ? normalizeRotations(
        rotations.filter((rotation) => Number.isFinite(rotation))
      )
    : [];

  if (normalizedRotations.length > 0) {
    const inferredRotationCount =
      inferRotationCountFromRotations(normalizedRotations);

    return {
      rotationCount: inferredRotationCount,
      displayRotationCount: inferredRotationCount ?? DEFAULT_ROTATION_COUNT,
      rotations: normalizedRotations,
    };
  }

  return {
    rotationCount: null,
    displayRotationCount: DEFAULT_ROTATION_COUNT,
    rotations: [0, 90],
  };
};

export const normalizeShapeForRotation = (
  shape: PolygonShape,
  rotation: number
): PolygonShape => {
  const rotatedShape = rotateShape(shape, rotation);

  return translateShape(
    rotatedShape,
    -rotatedShape.bounds.minX,
    -rotatedShape.bounds.minY
  );
};
