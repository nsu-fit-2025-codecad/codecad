import type { NfpRegion } from '@/lib/nesting/nfp/nfp';

const ROTATION_EPSILON = 1e-6;
const GAP_EPSILON = 1e-6;

const normalizeRotation = (rotation: number): number => {
  const mod = rotation % 360;
  const normalized = mod >= 0 ? mod : mod + 360;
  return Math.round(normalized / ROTATION_EPSILON) * ROTATION_EPSILON;
};

const normalizeGap = (gap: number): number =>
  Math.round(Math.max(0, gap) / GAP_EPSILON) * GAP_EPSILON;

export interface NfpCacheKey {
  stationaryId: string;
  movingId: string;
  inside: boolean;
  stationaryRotation: number;
  movingRotation: number;
  gap: number;
}

export class NfpCache {
  private readonly cache = new Map<string, NfpRegion>();

  private key(input: NfpCacheKey) {
    return [
      input.stationaryId,
      input.movingId,
      input.inside ? 'inside' : 'outside',
      normalizeRotation(input.stationaryRotation),
      normalizeRotation(input.movingRotation),
      normalizeGap(input.gap),
    ].join('|');
  }

  getOrBuild(key: NfpCacheKey, builder: () => NfpRegion): NfpRegion {
    const serializedKey = this.key(key);
    const cached = this.cache.get(serializedKey);

    if (cached) {
      return cached;
    }

    const value = builder();
    this.cache.set(serializedKey, value);
    return value;
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}
