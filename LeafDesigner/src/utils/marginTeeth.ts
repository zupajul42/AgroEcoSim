import { LeafMargin } from "../types/leaf";
import { Point, Point3 } from "./veinGenerator";

type P3 = { x: number; y: number; z: number };

interface ToothConfig {
  /** Tooth wavelength as a fraction of the ring's own bounding-box size, so tooth size
   *  scales with the leaf instead of needing to be re-tuned per geometry. */
  wavelengthFactor: number;
  /** Tooth height (base to tip) as a fraction of the wavelength. */
  depthRatio: number;
  shape: "sawtooth" | "triangle" | "sine";
}

// Deliberately no "entire" entry — that's the "no teeth" case, handled separately.
const TOOTH_CONFIG: Partial<Record<LeafMargin, ToothConfig>> = {
  serrate: { wavelengthFactor: 0.045, depthRatio: 0.35, shape: "sawtooth" },
  dentate: { wavelengthFactor: 0.07, depthRatio: 0.3, shape: "triangle" },
  lobed: { wavelengthFactor: 0.2, depthRatio: 0.45, shape: "sine" },
  incised: { wavelengthFactor: 0.09, depthRatio: 0.6, shape: "triangle" },
};

/** Height (0-1) of one tooth period at phase `t` (t wraps every 1.0). */
function toothWave(shape: ToothConfig["shape"], t: number): number {
  switch (shape) {
    case "sawtooth": {
      // Quick rise, long trailing fall — teeth lean forward along the ring direction,
      // the classic serrate look, rather than pointing straight out.
      const peak = 0.25;
      return t < peak ? t / peak : 1 - (t - peak) / (1 - peak);
    }
    case "triangle":
      return t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
    case "sine":
      return (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }
}

/**
 * Adds small periodic teeth around a closed ring of points, based on the leaf's botanical
 * margin type — the actual "serrate"/"dentate"/"lobed"/"incised" edge shape, layered on top
 * of whatever macro outline the veins already produced. "entire" (or no margin set) leaves
 * the ring untouched.
 *
 * The ring is resampled at even arc-length steps first, so tooth size stays consistent
 * regardless of how densely the source curve happened to be sampled, then each point is
 * pushed outward (away from the ring's centroid, never inward — the vein tree's lobeDepth
 * already owns any inward-cutting sinuses) by a periodic wave shaped per margin type. Teeth
 * are computed purely from (x, y); z, when present, is carried along by linear interpolation
 * between the two source points a resampled point falls between — a good approximation for
 * teeth this small even on an already-folded 3D boundary.
 */
function applyMarginTeeth3(ring: P3[], marginType: LeafMargin | undefined): P3[] {
  if (!marginType || ring.length < 3) return ring;
  const config = TOOTH_CONFIG[marginType];
  if (!config) return ring; // "entire" or unrecognized — no teeth

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const refScale = Math.max(maxX - minX, maxY - minY, 1e-4);
  const wavelength = refScale * config.wavelengthFactor;
  if (wavelength < 1e-5) return ring;
  const amplitude = wavelength * config.depthRatio;

  let cx = 0,
    cy = 0;
  ring.forEach((p) => {
    cx += p.x;
    cy += p.y;
  });
  cx /= ring.length;
  cy /= ring.length;

  const n = ring.length;
  const edgeLens: number[] = [];
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    edgeLens.push(len);
    perimeter += len;
  }
  if (perimeter < 1e-5) return ring;

  const stepsPerTooth = 6;
  const sampleCount = Math.max(n, Math.round(perimeter / (wavelength / stepsPerTooth)));
  const step = perimeter / sampleCount;

  const out: P3[] = [];
  let edgeIdx = 0;
  let edgeStart = 0;
  let dist = 0;

  for (let s = 0; s < sampleCount; s++) {
    while (edgeIdx < n - 1 && dist >= edgeStart + edgeLens[edgeIdx]) {
      edgeStart += edgeLens[edgeIdx];
      edgeIdx++;
    }
    const a = ring[edgeIdx];
    const b = ring[(edgeIdx + 1) % n];
    const edgeLen = edgeLens[edgeIdx] || 1e-6;
    const t = Math.min(1, Math.max(0, (dist - edgeStart) / edgeLen));

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const z = a.z + (b.z - a.z) * t;

    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;

    // Perpendicular to the tangent, flipped outward (away from the centroid) if needed.
    let nx = -ty;
    let ny = tx;
    if (nx * (x - cx) + ny * (y - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }

    const phase = (dist % wavelength) / wavelength;
    const disp = toothWave(config.shape, phase) * amplitude;

    out.push({ x: x + nx * disp, y: y + ny * disp, z });
    dist += step;
  }

  return out;
}

export function applyMarginTeethToOutline(points: Point[], marginType: LeafMargin | undefined): Point[] {
  if (!marginType || marginType === "entire") return points;
  const ring3 = points.map((p) => ({ x: p.x, y: p.y, z: 0 }));
  return applyMarginTeeth3(ring3, marginType).map((p) => ({ x: p.x, y: p.y }));
}

export function applyMarginTeethToFoldedOutline(points: Point3[], marginType: LeafMargin | undefined): Point3[] {
  if (!marginType || marginType === "entire") return points;
  return applyMarginTeeth3(points, marginType);
}
