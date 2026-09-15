import { LeafGeometry, RandomRange } from "../types/leaf";

// A leaf shape picks one geometry per level of detail (slot 0 = most detailed); the number of
// slots is per leaf. Scale arrays run in parallel to the geometry array.

type LodScales = (number | RandomRange)[] | undefined;

/** Geometry slots for a freshly created leaf. */
export function createDefaultLodGeom(): string[] {
  return ["def:quad", "def:ovate"];
}

export function getLodCount(geom: string[] | undefined): number {
  return geom?.length || 1;
}

/** Geometry id for `lod`; a sparse array falls back to the nearest lower, then higher slot. */
export function resolveLodGeom(geom: string[] | undefined, lod: number): string | undefined {
  if (!geom?.length) return undefined;
  if (geom[lod]) return geom[lod];
  for (let i = lod - 1; i >= 0; i--) if (geom[i]) return geom[i];
  for (let i = lod + 1; i < geom.length; i++) if (geom[i]) return geom[i];
  return undefined;
}

/** New geometry array with `geomId` at `lod`, padding missing slots with the last one. */
export function withLodGeom(geom: string[] | undefined, lod: number, geomId: string): string[] {
  const next = [...(geom ?? [])];
  while (next.length <= lod) next.push(next[next.length - 1] || "");
  next[lod] = geomId;
  return next;
}

/** Appends a slot seeded with `geomId` (default: a copy of the last slot). */
export function addLodGeom(geom: string[] | undefined, geomId?: string): { geom: string[]; index: number } {
  const next = [...(geom ?? [])];
  next.push(geomId ?? next[next.length - 1] ?? "def:quad");
  return { geom: next, index: next.length - 1 };
}

/** Removes the slot at `index`, never dropping below one slot. */
export function removeLodGeom(geom: string[] | undefined, index: number): string[] {
  const next = geom?.length ? [...geom] : [""];
  if (next.length > 1) next.splice(index, 1);
  return next;
}

/** Blade stretch for `lod`: a number, a random range, or 1 when unset. */
export function resolveLodScale(scales: LodScales, lod: number): number | RandomRange {
  return scales?.[lod] || 1;
}

/** New scale array with `value` at `lod`, padding missing slots with 1. */
export function withLodScale(scales: LodScales, lod: number, value: number | RandomRange): (number | RandomRange)[] {
  const next = [...(scales ?? [])];
  while (next.length <= lod) next.push(1);
  next[lod] = value;
  return next;
}

/** Removes the scale slot at `index` so it stays aligned with the geometry array. */
export function removeLodScale(scales: LodScales, index: number): LodScales {
  if (!scales || index >= scales.length) return scales;
  const next = [...scales];
  next.splice(index, 1);
  return next;
}

/** The LOD whose geometry has the most outline points. */
export function pickMostDetailedLod(geom: string[] | undefined, geoms: LeafGeometry[]): number {
  let bestLod = 0;
  let bestPoints = -1;
  for (let lod = 0; lod < getLodCount(geom); lod++) {
    const points = geoms.find((g) => g.id === resolveLodGeom(geom, lod))?.points?.length ?? 0;
    if (points > bestPoints) {
      bestPoints = points;
      bestLod = lod;
    }
  }
  return bestLod;
}
