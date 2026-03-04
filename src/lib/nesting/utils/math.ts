export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const finiteOrDefault = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeNumeric = (
  value: number | undefined,
  fallback: number,
  min: number,
  max?: number
) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const finiteValue = value as number;

  if (max === undefined) {
    return Math.max(min, finiteValue);
  }

  return clamp(finiteValue, min, max);
};
