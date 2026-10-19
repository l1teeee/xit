// Deterministic pseudo random number in [0, 1) from an index and a seed, so repeated paints agree.
export function hash01(index: number, seed: number): number {
  let hash = Math.imul(index ^ Math.imul(seed, 0x9e3779b1), 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}
