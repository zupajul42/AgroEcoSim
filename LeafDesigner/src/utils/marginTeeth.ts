import { LeafMargin, Point } from "../types/leaf";
import { OutlineShaper } from "./veinGenerator";
import { cross, dist, lerp, perimeter, size, smoothstep } from "./math";

interface MarginConfig {
  baseCount: number; // teeth per side at tooth size 1
  depthRatio: number; // tooth depth relative to its wavelength
  forwardLean: number; // how far a tooth leans toward the apex
  shape: "sawtooth" | "triangle" | "sine";
}

const MARGIN_CONFIGS: Record<Exclude<LeafMargin, "entire">, MarginConfig> = {
  serrate: { baseCount: 12, depthRatio: 0.55, forwardLean: 0.5, shape: "sawtooth" },
  dentate: { baseCount: 10, depthRatio: 0.45, forwardLean: 0.15, shape: "triangle" },
  lobed: { baseCount: 6, depthRatio: 0.5, forwardLean: 0.0, shape: "sine" },
  incised: { baseCount: 8, depthRatio: 0.7, forwardLean: 0.25, shape: "triangle" },
};

function marginConfig(marginType: LeafMargin | undefined): MarginConfig | undefined {
  return marginType && marginType !== "entire" ? MARGIN_CONFIGS[marginType] : undefined;
}

// Height (0-1) of one tooth at phase t in [0, 1), running from base toward apex.
function toothWave(shape: MarginConfig["shape"], phase: number): number {
  switch (shape) {
    case "sawtooth":
      // Gentle rise toward the apex up to 0.75, steep drop after.
      return phase < 0.75 ? Math.sin((phase / 0.75) * (Math.PI / 2)) : (1 - phase) / 0.25;
    case "triangle":
      return phase < 0.5 ? phase / 0.5 : (1 - phase) / 0.5;
    case "sine":
      return (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  }
}

// Full teeth everywhere, eased out over the last half tooth into the base and the apex.
function fadeAtEnds(along: number, total: number, wavelength: number): number {
  const ramp = Math.max(1e-6, wavelength / 2);
  return smoothstep(along / ramp) * smoothstep((total - along) / ramp);
}

// Tooth size follows the leaf's size, not the length of its edge.
function toothWavelength(ring: Point[], config: MarginConfig, toothSize: number): number {
  const perSide = Math.max(3, Math.round(config.baseCount / Math.max(0.2, toothSize)));
  return (size(ring) * 0.85) / perSide;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

// Pushes the points of a dense closed ring into teeth. The ring is split at its lowest and
// highest point into two sides, both walked base -> apex so a symmetric ring gets symmetric
// teeth. Nothing may fold the edge over itself: teeth shrink into notches too narrow for them,
// the forward lean stays under the local point spacing, and leftover crossings are relaxed away.
function addTeeth(ring: Point[], config: MarginConfig, toothSize: number, toothDepth: number): Point[] {
  const n = ring.length;
  if (n < 6) return ring;

  let apexIdx = 0;
  let baseIdx = 0;
  for (let i = 0; i < n; i++) {
    if (ring[i].y > ring[apexIdx].y) apexIdx = i;
    if (ring[i].y < ring[baseIdx].y) baseIdx = i;
  }
  const sideIndices = (direction: 1 | -1) => {
    const indices: number[] = [];
    for (let cur = baseIdx; cur !== apexIdx; cur = (cur + direction + n) % n) indices.push(cur);
    indices.push(apexIdx);
    return indices;
  };

  const wavelength = toothWavelength(ring, config, toothSize);
  const amplitude = wavelength * config.depthRatio * Math.max(0, toothDepth);
  const minGap = wavelength / 12;

  // How far each point may move outward before it could hit a point at least a tooth away
  // along the ring (the opposite flank of a notch).
  const arcLength: number[] = [0];
  for (let i = 0; i < n; i++) arcLength.push(arcLength[i] + dist(ring[i], ring[(i + 1) % n]));
  const total = arcLength[n];
  const clearance = new Array<number>(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const alongRing = Math.min(arcLength[j] - arcLength[i], total - (arcLength[j] - arcLength[i]));
      if (alongRing < wavelength) continue;
      const half = dist(ring[i], ring[j]) / 2;
      clearance[i] = Math.min(clearance[i], half);
      clearance[j] = Math.min(clearance[j], half);
    }
  }

  let twiceArea = 0;
  for (let i = 0; i < n; i++) twiceArea += ring[i].x * ring[(i + 1) % n].y - ring[(i + 1) % n].x * ring[i].y;
  const ringIsCcw = twiceArea >= 0;

  const shift: Point[] = ring.map(() => ({ x: 0, y: 0 }));

  const shapeSide = (indices: number[], direction: 1 | -1) => {
    const outwardSign = (ringIsCcw ? 1 : -1) * direction;
    const count = indices.length;
    if (count < 3) return;

    const along: number[] = [0];
    for (let i = 0; i < count - 1; i++) along.push(along[i] + dist(ring[indices[i]], ring[indices[i + 1]]));
    const sideLength = along[count - 1];
    if (sideLength < 1e-4) return;

    const sideShift: Point[] = indices.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < count; i++) {
      const fade = fadeAtEnds(along[i], sideLength, wavelength);
      if (fade <= 1e-5) continue;

      // Tangent toward the apex over a window of at least minGap on each side, so two ring
      // points sitting very close together don't throw it off.
      let prev = i;
      while (prev > 0 && along[i] - along[prev] < minGap) prev--;
      let next = i;
      while (next < count - 1 && along[next] - along[i] < minGap) next++;
      let tx = ring[indices[next]].x - ring[indices[prev]].x;
      let ty = ring[indices[next]].y - ring[indices[prev]].y;
      const tlen = Math.hypot(tx, ty) || 1;
      tx /= tlen;
      ty /= tlen;
      const nx = ty * outwardSign;
      const ny = -tx * outwardSign;

      const phase = (((along[i] % wavelength) + wavelength) % wavelength) / wavelength;
      const wave = toothWave(config.shape, phase);
      const outward = wave * Math.min(amplitude, clearance[indices[i]] * 0.8) * fade;
      // The lean moves a point along the edge; keep it under the local spacing so no point can
      // overtake its neighbor.
      const spacing = Math.min(
        i > 0 ? along[i] - along[i - 1] : Infinity,
        i < count - 1 ? along[i + 1] - along[i] : Infinity,
      );
      const lean = wave * amplitude * fade * config.forwardLean;
      const forward = Math.max(-0.3 * spacing, Math.min(0.3 * spacing, lean));

      sideShift[i] = { x: nx * outward + tx * forward, y: ny * outward + ty * forward };
    }

    // Two ring points practically on top of each other move as one.
    for (let i = 1; i < count; i++) if (along[i] - along[i - 1] < minGap) sideShift[i] = sideShift[i - 1];
    indices.forEach((ringIdx, i) => {
      shift[ringIdx] = sideShift[i];
    });
  };

  shapeSide(sideIndices(1), 1);
  shapeSide(sideIndices(-1), -1);

  // Wherever two nearby edge segments cross, ease the points between them back toward the outline.
  const at = (i: number): Point => ({ x: ring[i].x + shift[i].x, y: ring[i].y + shift[i].y });
  for (let pass = 0; pass < 10; pass++) {
    let crossed = false;
    for (let i = 0; i < n; i++) {
      for (let k = 2; k <= 4; k++) {
        const j = (i + k) % n;
        if (!segmentsCross(at(i), at((i + 1) % n), at(j), at((j + 1) % n))) continue;
        for (let m = 1; m <= k; m++) {
          const idx = (i + m) % n;
          shift[idx] = { x: shift[idx].x * 0.5, y: shift[idx].y * 0.5 };
        }
        crossed = true;
      }
    }
    if (!crossed) break;
  }

  return ring.map((p, i) => ({ x: p.x + shift[i].x, y: p.y + shift[i].y }));
}

/** The margin as an OutlineShaper: the ring is first densified along its own edges (about
 *  subdivisions/2 points per tooth), then pushed into teeth. `undefined` for an entire margin. */
export function marginOutlineShaper(
  marginType: LeafMargin | undefined,
  toothSize = 1,
  toothDepth = 1,
  subdivisions = 6,
): OutlineShaper | undefined {
  const config = marginConfig(marginType);
  if (!config) return undefined;

  return (ring) => {
    const n = ring.length;
    const identity = { ring: ring.map((p) => ({ x: p.x, y: p.y })), originalIndex: ring.map((_, i) => i) };
    if (n < 6) return identity;

    const samplesPerTooth = Math.max(3, Math.round(subdivisions / 2));
    const spacing = Math.max(toothWavelength(ring, config, toothSize) / samplesPerTooth, perimeter(ring) / 3000);
    if (!(spacing > 1e-6)) return identity;

    const dense: Point[] = [];
    const originalIndex: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      originalIndex.push(dense.length);
      dense.push({ x: a.x, y: a.y });
      const segCount = Math.max(1, Math.round(dist(a, b) / spacing));
      for (let s = 1; s < segCount; s++)
        dense.push({ x: lerp(a.x, b.x, s / segCount), y: lerp(a.y, b.y, s / segCount) });
    }

    return { ring: addTeeth(dense, config, toothSize, toothDepth), originalIndex };
  };
}

/** The toothed outline itself, as drawn by the 2D editor's margin preview. */
export function applyMarginTeethToOutline(
  points: Point[],
  marginType: LeafMargin | undefined,
  toothSize?: number,
  toothDepth?: number,
  subdivisions?: number,
): Point[] {
  const shaper = marginOutlineShaper(marginType, toothSize, toothDepth, subdivisions);
  return shaper ? shaper(points).ring : points;
}
