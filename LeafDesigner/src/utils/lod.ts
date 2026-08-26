/** A leaf shape can pick a different geometry per level of detail — how many LODs a leaf
 *  has is dynamic per leaf (grow/shrink it with addLodGeom/removeLodGeom), not a fixed
 *  count. Kept as small, standalone helpers since both the editor UI and the mesh generator
 *  need to read/write these slots the same way. */

/** Per-LOD geometry array for a freshly created leaf: 2 LODs, 0 = highest detail. */
export function createDefaultLodGeom(): string[] {
  return ["def:quad", "def:ovate"];
}

/** How many LODs a shape currently has — legacy plain-string geom counts as 1. */
export function getLodCount(geom: string[] | string | undefined): number {
  if (typeof geom === "string") return 1;
  if (!Array.isArray(geom) || geom.length === 0) return 1;
  return geom.length;
}

/**
 * Resolves the geometry id to use for `lod`, tolerating incomplete or legacy data:
 *  - a plain string (how `geom` looked before LOD support) is returned as-is for every LOD
 *  - a sparse array falls back to the nearest lower LOD, then the nearest higher one
 */
export function resolveLodGeom(geom: string[] | string | undefined, lod: number): string | undefined {
  if (typeof geom === "string") return geom;
  if (!Array.isArray(geom) || geom.length === 0) return undefined;
  if (geom[lod]) return geom[lod];
  for (let i = lod - 1; i >= 0; i--) if (geom[i]) return geom[i];
  for (let i = lod + 1; i < geom.length; i++) if (geom[i]) return geom[i];
  return undefined;
}

/** Returns a NEW per-LOD array with `geomId` set at `lod`. `lod` is expected to already be
 *  an existing slot — use addLodGeom to grow the array with a new one instead. */
export function withLodGeom(geom: string[] | string | undefined, lod: number, geomId: string): string[] {
  const base: string[] = typeof geom === "string" ? [geom] : Array.isArray(geom) && geom.length > 0 ? [...geom] : [];
  while (base.length <= lod) base.push(base[base.length - 1] || "");
  base[lod] = geomId;
  return base;
}

/** Appends a new LOD slot at the end, seeded with `geomId` (defaults to a copy of the last
 *  slot so it never comes up empty). Returns the new array and the index it was added at. */
export function addLodGeom(
  geom: string[] | string | undefined,
  geomId?: string,
): { geom: string[]; index: number } {
  const base: string[] = typeof geom === "string" ? [geom] : Array.isArray(geom) && geom.length > 0 ? [...geom] : [];
  base.push(geomId ?? base[base.length - 1] ?? "def:quad");
  return { geom: base, index: base.length - 1 };
}

/** Removes the LOD slot at `index`. Refuses to drop the array below 1 slot. */
export function removeLodGeom(geom: string[] | string | undefined, index: number): string[] {
  const base: string[] = typeof geom === "string" ? [geom] : Array.isArray(geom) && geom.length > 0 ? [...geom] : [""];
  if (base.length <= 1) return base;
  base.splice(index, 1);
  return base;
}

/** Resolves the X/Y blade stretch for `lod` — 1 (no stretch) when the slot is unset. */
export function resolveLodScale(scales: number[] | undefined, lod: number): number {
  if (!Array.isArray(scales) || !scales[lod]) return 1;
  return scales[lod];
}

/** Returns a NEW per-LOD scale array with `value` set at `lod`, padding unset slots to 1. */
export function withLodScale(scales: number[] | undefined, lod: number, value: number): number[] {
  const base: number[] = Array.isArray(scales) ? [...scales] : [];
  while (base.length <= lod) base.push(1);
  base[lod] = value;
  return base;
}

/** Removes the scale slot at `index` (if the array reaches that far), so indices stay
 *  aligned with the geom array after removeLodGeom. Undefined stays undefined. */
export function removeLodScale(scales: number[] | undefined, index: number): number[] | undefined {
  if (!Array.isArray(scales) || index >= scales.length) return scales;
  const base = [...scales];
  base.splice(index, 1);
  return base;
}
