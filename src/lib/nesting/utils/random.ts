export const randomInt = (maxExclusive: number, random: () => number) =>
  Math.min(maxExclusive - 1, Math.floor(random() * maxExclusive));

export const hashString = (value: string) => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0 || 1;

  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
};
