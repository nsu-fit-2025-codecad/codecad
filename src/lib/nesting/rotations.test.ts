import { describe, expect, it } from 'vitest';
import {
  resolveRotationSelection,
  rotationCountToAngles,
} from '@/lib/nesting/rotations';

describe('rotationCountToAngles', () => {
  it('returns only zero for 1 orientation', () => {
    expect(rotationCountToAngles(1)).toEqual([0]);
  });

  it('returns quarter turns for 4 orientations', () => {
    expect(rotationCountToAngles(4)).toEqual([0, 90, 180, 270]);
  });

  it('uses 45 degree steps for 8 orientations', () => {
    const angles = rotationCountToAngles(8);

    expect(angles).toHaveLength(8);
    expect(angles[1] - angles[0]).toBeCloseTo(45, 6);
    expect(angles).toContain(315);
  });

  it('uses 22.5 degree steps for 16 orientations', () => {
    const angles = rotationCountToAngles(16);

    expect(angles).toHaveLength(16);
    expect(angles[1] - angles[0]).toBeCloseTo(22.5, 6);
    expect(angles[15]).toBeCloseTo(337.5, 6);
  });
});

describe('resolveRotationSelection', () => {
  it('prefers rotationCount over legacy rotations', () => {
    expect(
      resolveRotationSelection({
        rotationCount: 1,
        rotations: [0, 90, 180, 270],
      })
    ).toEqual({
      rotationCount: 1,
      rotations: [0],
    });
  });

  it('keeps legacy default rotation set when only allowRotation is provided', () => {
    expect(resolveRotationSelection({ allowRotation: true })).toEqual({
      rotationCount: 4,
      rotations: [0, 90],
    });
  });
});
