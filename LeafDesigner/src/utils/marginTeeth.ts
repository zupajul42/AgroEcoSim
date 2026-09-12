import { LeafMargin } from "../types/leaf";
import { OutlineShaper, Point } from "./veinGenerator";

interface MarginConfig {
  baseCount: number;
  depthRatio: number;
  forwardLean: number;
  shape: "sawtooth" | "triangle" | "sine";
}

const MARGIN_CONFIGS: Record<Exclude<LeafMargin, "entire">, MarginConfig> = {
  serrate: { baseCount: 12, depthRatio: 0.55, forwardLean: 0.5, shape: "sawtooth" },
  dentate: { baseCount: 10, depthRatio: 0.45, forwardLean: 0.15, shape: "triangle" },
  lobed: { baseCount: 6, depthRatio: 0.5, forwardLean: 0.0, shape: "sine" },
  incised: { baseCount: 8, depthRatio: 0.7, forwardLean: 0.25, shape: "triangle" },
};

// Height (0-1) of one tooth period at phase t in [0, 1) running from base toward apex.
function toothWave(shape: MarginConfig["shape"], phase: number): number {
  switch (shape) {
    case "sawtooth": {
      // Gentle organic rise towards apex up to 0.75, steep forward drop from 0.75 to 1.0
      if (phase < 0.75) {
        return Math.sin((phase / 0.75) * (Math.PI / 2));
      } else {
        return (1 - phase) / 0.25;
      }
    }
    case "triangle":
      return phase < 0.5 ? phase / 0.5 : (1 - phase) / 0.5;
    case "sine":
      return (Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    default:
      return 0;
  }
}

// Full teeth everywhere; eased out only over the last half tooth into the base and the apex point.
function marginEnvelope(s: number, total: number, wavelength: number): number {
  const ramp = Math.max(1e-6, wavelength / 2);
  const ease = (t: number) => {
    const c = Math.max(0, Math.min(1, t));
    return c * c * (3 - 2 * c);
  };
  return ease(s / ramp) * ease((total - s) / ramp);
}

function toothWavelength(ring: Point[], config: MarginConfig, toothSize: number): number {
  const perSide = Math.max(3, Math.round(config.baseCount / Math.max(0.2, toothSize)));
  return (leafSize(ring) * 0.85) / perSide;
}

function leafSize(ring: Point[]): number {
  const xs = ring.map((p) => p.x);
  const ys = ring.map((p) => p.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/**
 * Displaces the points of a closed (already dense enough — see `marginOutlineShaper`) outline
 * ring into botanical margin teeth:
 * - The ring is split at its lowest and highest point into two sides, both walked base -> apex,
 *   so the tooth phase runs the same way on both and a symmetric ring gets symmetric teeth.
 * - Teeth run the whole length, easing out only over the last half tooth into the base and the
 *   apex (`marginEnvelope`), and lean forward toward the apex by the margin type's `forwardLean`.
 * - Tooth size follows the leaf's height (`toothWavelength`), not the length of its edge.
 * - Displacement is kept from ever folding the edge over itself: outward normals come from the
 *   ring's winding, teeth shrink into notches too narrow for them (`clearance`), the forward
 *   lean stays under the local sample spacing, and any remaining local crossing is relaxed away.
 */
function applyBotanicalMarginTeeth(
  ring: Point[],
  marginType: LeafMargin | undefined,
  toothSize = 1,
  toothDepth = 1,
): Point[] {
  if (!marginType || marginType === "entire" || ring.length < 6) {
    return ring;
  }
  const config = MARGIN_CONFIGS[marginType as Exclude<LeafMargin, "entire">];
  if (!config) return ring;

  const n = ring.length;

  // 1. Find Apex (max y) and Base (min y)
  let apexIdx = 0;
  let baseIdx = 0;
  let maxY = -Infinity;
  let minY = Infinity;

  for (let i = 0; i < n; i++) {
    if (ring[i].y > maxY) {
      maxY = ring[i].y;
      apexIdx = i;
    }
    if (ring[i].y < minY) {
      minY = ring[i].y;
      baseIdx = i;
    }
  }

  // 2. Identify the two sides (both from Base to Apex):
  // Right side: base -> apex (increasing around CCW loop)
  const rightIndices: number[] = [];
  let cur = baseIdx;
  while (cur !== apexIdx) {
    rightIndices.push(cur);
    cur = (cur + 1) % n;
  }
  rightIndices.push(apexIdx);

  // Left side: base -> apex (decreasing around CCW loop)
  const leftIndices: number[] = [];
  cur = baseIdx;
  while (cur !== apexIdx) {
    leftIndices.push(cur);
    cur = (cur - 1 + n) % n;
  }
  leftIndices.push(apexIdx);

  const wavelength = toothWavelength(ring, config, toothSize);
  const amplitude = wavelength * config.depthRatio * Math.max(0, toothDepth);

  // How far each point may be pushed outward before it could collide with the next one
  const cum: number[] = [0];
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(q.x - p.x, q.y - p.y));
  }
  const perimeter = cum[n];
  const clearance = new Array<number>(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const alongRing = Math.min(cum[j] - cum[i], perimeter - (cum[j] - cum[i]));
      if (alongRing < wavelength) continue;
      const half = Math.hypot(ring[j].x - ring[i].x, ring[j].y - ring[i].y) / 2;
      if (half < clearance[i]) clearance[i] = half;
      if (half < clearance[j]) clearance[j] = half;
    }
  }
  const dispAll: Point[] = ring.map(() => ({ x: 0, y: 0 }));

  let twiceArea = 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    twiceArea += p.x * q.y - q.x * p.y;
  }
  const ringIsCcw = twiceArea >= 0;

  const processSide = (indices: number[], alongRing: boolean) => {
    const outwardSign = (ringIsCcw ? 1 : -1) * (alongRing ? 1 : -1);
    const sideLen = indices.length;
    if (sideLen < 3) return;

    // Cumulative arc length from base to apex
    const s: number[] = [0];
    for (let i = 0; i < sideLen - 1; i++) {
      const pA = ring[indices[i]];
      const pB = ring[indices[i + 1]];
      s.push(s[i] + Math.hypot(pB.x - pA.x, pB.y - pA.y));
    }
    const totalL = s[sideLen - 1];
    if (totalL < 1e-4) return;

    const minGap = wavelength / 12;
    const disp: Point[] = indices.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < sideLen; i++) {
      const env = marginEnvelope(s[i], totalL, wavelength);
      if (env <= 1e-5) continue; // base or apex untouched

      // Tangent toward the apex, read over a window of at least a fraction of a tooth on each
      // side, so it isn't thrown off by two ring points that happen to sit very close together.
      let prev = i;
      while (prev > 0 && s[i] - s[prev] < minGap) prev--;
      let next = i;
      while (next < sideLen - 1 && s[next] - s[i] < minGap) next++;
      const prevIdx = indices[prev];
      const nextIdx = indices[next];
      let tx = ring[nextIdx].x - ring[prevIdx].x;
      let ty = ring[nextIdx].y - ring[prevIdx].y;
      const tlen = Math.hypot(tx, ty) || 1;
      tx /= tlen;
      ty /= tlen;

      const nx = ty * outwardSign;
      const ny = -tx * outwardSign;

      const phase = (((s[i] % wavelength) + wavelength) % wavelength) / wavelength;
      const wave = toothWave(config.shape, phase);

      const origIdx = indices[i];
      const dispNorm = wave * Math.min(amplitude, clearance[origIdx] * 0.8) * env;
      // The forward lean shifts a point ALONG the edge; keep that well under the local sample
      // spacing so no point can ever overtake its neighbor (which would knot the edge).
      const spacing = Math.min(
        i > 0 ? s[i] - s[i - 1] : Infinity,
        i < sideLen - 1 ? s[i + 1] - s[i] : Infinity,
      );
      const lean = wave * amplitude * env * config.forwardLean;
      const dispTang = Math.max(-0.3 * spacing, Math.min(0.3 * spacing, lean));

      disp[i] = { x: nx * dispNorm + tx * dispTang, y: ny * dispNorm + ty * dispTang };
    }

    // Two ring points practically on top of each other (a vein tip's own outline point right
    // next to a spline sample, say) move as one — displaced even slightly differently, the
    // second could land behind the first and knot the edge into a microscopic loop.
    for (let i = 1; i < sideLen; i++) {
      if (s[i] - s[i - 1] < minGap) disp[i] = disp[i - 1];
    }
    indices.forEach((origIdx, i) => {
      dispAll[origIdx] = disp[i];
    });
  };

  processSide(rightIndices, true);
  processSide(leftIndices, false);

  // Wherever two nearby edge segments end up crossing, ease the points between them back toward the outline.
  const at = (i: number): Point => ({ x: ring[i].x + dispAll[i].x, y: ring[i].y + dispAll[i].y });
  for (let pass = 0; pass < 10; pass++) {
    let crossed = false;
    for (let i = 0; i < n; i++) {
      for (let k = 2; k <= 4; k++) {
        const j = (i + k) % n;
        if (!segmentsCross(at(i), at((i + 1) % n), at(j), at((j + 1) % n))) continue;
        for (let m = 1; m <= k; m++) {
          const idx = (i + m) % n;
          dispAll[idx] = { x: dispAll[idx].x * 0.5, y: dispAll[idx].y * 0.5 };
        }
        crossed = true;
      }
    }
    if (!crossed) break;
  }

  return ring.map((p, i) => ({ x: p.x + dispAll[i].x, y: p.y + dispAll[i].y }));
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = orient(c, d, a);
  const d2 = orient(c, d, b);
  const d3 = orient(a, b, c);
  const d4 = orient(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * The margin as an outline shaper (see `OutlineShaper` in veinGenerator.ts): first the ring is
 * densified along its own edges — every new point sits exactly ON the outline it subdivides,
 * about six per tooth so the shaping below reads as smooth teeth rather than as the ring's own
 * (usually much coarser) vein-derived sampling — then the botanical tooth shaping is applied to
 * the dense ring. `undefined` for a margin that has no teeth. Both the 2D editor's preview and
 * the 3D blade run the outline through this same shaper, so they always show the same teeth.
 */
export function marginOutlineShaper(
  marginType: LeafMargin | undefined,
  toothSize = 1,
  toothDepth = 1,
  subdivisions = 6,
): OutlineShaper | undefined {
  if (!marginType || marginType === "entire") return undefined;
  const config = MARGIN_CONFIGS[marginType as Exclude<LeafMargin, "entire">];
  if (!config) return undefined;

  return (ring) => {
    const n = ring.length;
    const identity = { ring: ring.map((p) => ({ x: p.x, y: p.y })), originalIndex: ring.map((_, i) => i) };
    if (n < 6) return identity;

    let perimeter = 0;
    for (let i = 0; i < n; i++) perimeter += Math.hypot(ring[(i + 1) % n].x - ring[i].x, ring[(i + 1) % n].y - ring[i].y);
    const samplesPerTooth = Math.max(3, Math.round(subdivisions / 2));
    const spacing = Math.max(toothWavelength(ring, config, toothSize) / samplesPerTooth, perimeter / 3000);
    if (!(spacing > 1e-6)) return identity;

    const dense: Point[] = [];
    const originalIndex: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      originalIndex.push(dense.length);
      dense.push({ x: a.x, y: a.y });
      const segCount = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / spacing));
      for (let s = 1; s < segCount; s++) {
        const t = s / segCount;
        dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }

    return { ring: applyBotanicalMarginTeeth(dense, marginType, toothSize, toothDepth), originalIndex };
  };
}

/** The shaped (toothed) outline itself — what the 2D editor draws as its margin preview. */
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
