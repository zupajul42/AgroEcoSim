import { RandomRange } from "../types/leaf";

export function isRandomRange(value: unknown): value is RandomRange {
  return !!value && typeof value === "object" && "min" in (value as any) && "max" in (value as any);
}

export function toRange(value: number | RandomRange | undefined, fallback: number): RandomRange {
  if (isRandomRange(value)) return value;
  const v = value ?? fallback;
  return { min: v, max: v };
}

function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function resolveRandomValue(
  value: number | RandomRange | undefined,
  seed: number,
  key: string,
  index: number,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  if (typeof value === "number") return value;
  const { min, max } = value;
  if (min >= max) return min;
  const t = mulberry32(hashSeed(seed, key, index))();
  return min + t * (max - min);
}

export function rerollSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
