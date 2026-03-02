import { rotateShape, translateShape } from '@/lib/nesting/polygon-math';
import type { PolygonShape } from '@/lib/nesting/types';

const ROTATION_EPSILON = 1e-6;

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
