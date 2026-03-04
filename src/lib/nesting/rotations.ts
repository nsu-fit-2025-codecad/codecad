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
  rotationCount: number;
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
  rotations: number[],
  allowRotation: boolean
): number => {
  if (rotations.length === 1 && Math.abs(rotations[0]) <= ROTATION_EPSILON) {
    return MIN_ROTATION_COUNT;
  }

  const signature = rotations.map((rotation) => rotation.toFixed(6)).join(',');

  if (
    signature === '0.000000,90.000000' ||
    signature === '0.000000,90.000000,180.000000,270.000000'
  ) {
    return 4;
  }

  if (signature === '0.000000,180.000000') {
    return 2;
  }

  if (
    rotations[0] === 0 &&
    rotations.length >= MIN_ROTATION_COUNT &&
    rotations.length <= MAX_ROTATION_COUNT
  ) {
    const expected = rotationCountToAngles(rotations.length);
    const matches = expected.every(
      (angle, index) => Math.abs(angle - rotations[index]) <= ROTATION_EPSILON
    );

    if (matches) {
      return rotations.length;
    }
  }

  return allowRotation ? DEFAULT_ROTATION_COUNT : MIN_ROTATION_COUNT;
};

export const resolveRotationSelection = ({
  rotationCount,
  rotations,
  allowRotation = true,
}: RotationSelectionInput): RotationSelection => {
  if (typeof rotationCount === 'number' && Number.isFinite(rotationCount)) {
    const normalizedCount = normalizeRotationCount(
      rotationCount,
      allowRotation ? DEFAULT_ROTATION_COUNT : MIN_ROTATION_COUNT
    );

    return {
      rotationCount: normalizedCount,
      rotations: rotationCountToAngles(normalizedCount),
    };
  }

  const normalizedRotations = Array.isArray(rotations)
    ? normalizeRotations(
        rotations.filter((rotation) => Number.isFinite(rotation))
      )
    : [];

  if (normalizedRotations.length > 0) {
    return {
      rotationCount: inferRotationCountFromRotations(
        normalizedRotations,
        allowRotation
      ),
      rotations: normalizedRotations,
    };
  }

  const fallbackCount = allowRotation
    ? DEFAULT_ROTATION_COUNT
    : MIN_ROTATION_COUNT;
  const fallbackRotations = allowRotation ? [0, 90] : [0];

  return {
    rotationCount: fallbackCount,
    rotations: fallbackRotations,
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
