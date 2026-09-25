import { LeafGeometry, LeafMargin, Point } from "../types/leaf";
import { OutlinePin, OutlineShaper } from "./veinGenerator";
import { dist, lerp } from "./math";

/** The two margin values a geometry stores. */
export interface MarginParams {
  toothCount: number; // teeth along one side of the blade, base -> apex
  toothHeight: number; // height of a tooth as a fraction of its wavelength
}

type ToothShape = "triangle" | "halfSine" | "sine";

interface MarginConfig extends MarginParams {
  peak: number; // phase (0-1) of a tooth's highest point; above 0.5 the tooth leans toward the apex
  apexPhase: number; // phase (0-1) at which the two sides' waves meet at the leaf apex (peak = at full height, 0 = in a notch)
  shape: ToothShape;
}

const MARGIN_CONFIGS: Record<Exclude<LeafMargin, "entire">, MarginConfig> = {
  serrate: { toothCount: 12, toothHeight: 0.5, peak: 0.9, apexPhase: 0.9, shape: "triangle" },
  sinuate: { toothCount: 6, toothHeight: 0.35, peak: 0.5, apexPhase: 0.5, shape: "sine" },
  dentate: { toothCount: 10, toothHeight: 0.45, peak: 0.5, apexPhase: 0.5, shape: "triangle" },
  crenate: { toothCount: 10, toothHeight: 0.4, peak: 0.5, apexPhase: 0.5, shape: "halfSine" },
};

const AXIS_EPS = 0.001;
const CORNER_ANGLE = (30 * Math.PI) / 180; // a ring corner turning at least this much anchors the teeth
const MAX_NOTCH_ANGLE = (170 * Math.PI) / 180;
const REFERENCE_SAMPLES_PER_EDGE = 6;
const ROOM_SHARE = 0.8; // a tooth may use this share of the room it has before hitting something
const MIN_PROFILE = 0.05; // profile values below this don't limit a tooth (they are nearly on the outline)
const MIN_PIN_RISE = 0.1; // a vein must point at least this much outward for its tip to carry a tooth
const VEIN_CLEARANCE = 1 / 25; // of a wavelength: how far the points next to a tip stay off its vein

function marginConfig(marginType: LeafMargin | undefined): MarginConfig | undefined {
  return marginType && marginType !== "entire" ? MARGIN_CONFIGS[marginType] : undefined;
}

/** Tooth count and height of a geometry, falling back to its margin type's defaults. */
export function resolveMarginParams(
  geom: Pick<LeafGeometry, "margin" | "marginToothCount" | "marginToothHeight">,
): MarginParams {
  const config = marginConfig(geom.margin) ?? MARGIN_CONFIGS.serrate;
  return {
    toothCount: geom.marginToothCount ?? config.toothCount,
    toothHeight: geom.marginToothHeight ?? config.toothHeight,
  };
}

// Height (0-1) of one tooth at phase in [0, 1): 0 at both notches, 1 at `peak`.
function toothProfile(shape: ToothShape, peak: number, phase: number): number {
  const u = phase < peak ? phase / peak : (1 - phase) / (1 - peak);
  switch (shape) {
    case "triangle":
      return u;
    case "halfSine":
      return Math.sin((Math.PI / 2) * u);
    case "sine":
      return (1 - Math.cos(Math.PI * u)) / 2;
  }
}

// The phases sampled in every tooth, ascending in [0, 1): the notch, the peak and `perFlank - 1`
// points on each flank. A triangle needs only its corners; curved shapes follow `subdivisions`,
// but never drop below three points per flank or the curve reads as a triangle.
function toothPhases(shape: ToothShape, peak: number, subdivisions: number): number[] {
  const perFlank = shape === "triangle" ? 1 : Math.max(3, Math.round(subdivisions / 2));
  const phases: number[] = [];
  for (let i = 0; i < perFlank; i++) phases.push((peak * i) / perFlank);
  for (let i = 0; i < perFlank; i++) phases.push(peak + ((1 - peak) * i) / perFlank);
  return phases;
}

const unit = (v: Point): Point => {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-12 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const angleBetween = (a: Point, b: Point) => Math.atan2(Math.abs(a.x * b.y - a.y * b.x), a.x * b.x + a.y * b.y);
const cross2 = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const outwardNormal = (dir: Point, sign: number): Point => ({ x: dir.y * sign, y: -dir.x * sign });

// A point where the teeth are pinned: a notch has height 0 there, a peak the full tooth height.
interface Anchor {
  at: number; // index along the side
  kind: "notch" | "peak";
  phase?: number; // fixed phase of the wave here (the apex); otherwise 0 for a notch, the peak for a peak
}

// The smooth reference curve of one side, densely sampled and parametrized by arc length.
interface Curve {
  pos: Point[];
  arc: number[]; // arc length at each point
  dir: Point[]; // unit tangent at each point (bisector of its two edges)
  room: number[]; // how far each point may move outward before the offset curve folds over itself
  atSide: number[]; // curve index of each side point
  length: number;
}

// Cubic Hermite spline through the side points, with the corners kept at `anchors` (one-sided
// tangents there) and smooth bisector tangents everywhere else, scaled by the chord length.
// `notches` are the anchors in sharp concave corners.
function referenceCurve(q: Point[], anchors: Set<number>, notches: Set<number>, outwardSign: number): Curve {
  const m = q.length;
  const edgeDir = (i: number) => unit(sub(q[i + 1], q[i]));
  const tangentOut = (i: number) =>
    i === 0 || i === m - 1 || anchors.has(i) ? edgeDir(i) : unit(add(edgeDir(i - 1), edgeDir(i)));
  const tangentIn = (i: number) =>
    i === 0 || i === m - 1 || anchors.has(i) ? edgeDir(i - 1) : unit(add(edgeDir(i - 1), edgeDir(i)));

  const pos: Point[] = [];
  const atSide: number[] = [];
  for (let i = 0; i < m - 1; i++) {
    const d = dist(q[i], q[i + 1]);
    atSide.push(pos.length);
    pos.push(q[i]);
    if (d > 1e-7) {
      const t0 = tangentOut(i);
      const t1 = tangentIn(i + 1);
      for (let s = 1; s < REFERENCE_SAMPLES_PER_EDGE; s++) {
        const t = s / REFERENCE_SAMPLES_PER_EDGE;
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        pos.push({
          x: h00 * q[i].x + h10 * t0.x * d + h01 * q[i + 1].x + h11 * t1.x * d,
          y: h00 * q[i].y + h10 * t0.y * d + h01 * q[i + 1].y + h11 * t1.y * d,
        });
      }
    }
  }
  atSide.push(pos.length);
  pos.push(q[m - 1]);

  const n = pos.length;
  const arc = [0];
  for (let k = 0; k + 1 < n; k++) arc.push(arc[k] + dist(pos[k], pos[k + 1]));
  const edges = pos.slice(0, -1).map((p, k) => unit(sub(pos[k + 1], p)));
  const dir = pos.map((_, k) => {
    if (k === 0) return edges[0];
    if (k === n - 1) return edges[n - 2];
    const bisector = unit(add(edges[k - 1], edges[k]));
    return bisector.x || bisector.y ? bisector : edges[k];
  });

  // Concave turn (bending toward the outside) at each point, 0 where the curve is convex.
  const concaveTurn = pos.map((_, k) => {
    if (k === 0 || k === n - 1) return 0;
    return cross2(edges[k - 1], edges[k]) * outwardSign < 0 ? angleBetween(edges[k - 1], edges[k]) : 0;
  });
  // An outward offset larger than the radius of curvature folds a concave arc over itself.
  const room = concaveTurn.map((turn, k) => (turn > 1e-6 ? (arc[k + 1] - arc[k - 1]) / 2 / turn : Infinity));
  // Two flanks meeting in a notch of turn θ: a point at arc distance a from the corner reaches the
  // bisector (and the tooth on the other flank) once it moves out by a · cot(θ/2).
  for (const a of notches) {
    const k = atSide[a];
    if (concaveTurn[k] <= 1e-6) continue;
    const cot = 1 / Math.tan(Math.min(concaveTurn[k], MAX_NOTCH_ANGLE) / 2);
    for (let j = 0; j < n; j++) room[j] = Math.min(room[j], Math.abs(arc[j] - arc[k]) * cot);
  }

  return { pos, arc, dir, room, atSide, length: arc[n - 1] };
}

// Position, tangent and room of the curve at arc length s.
function curveAt(curve: Curve, s: number) {
  const { arc } = curve;
  let lo = 0;
  let hi = arc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arc[mid] <= s) lo = mid;
    else hi = mid;
  }
  const span = arc[hi] - arc[lo];
  const t = span > 1e-12 ? Math.max(0, Math.min(1, (s - arc[lo]) / span)) : 0;
  return {
    pos: { x: lerp(curve.pos[lo].x, curve.pos[hi].x, t), y: lerp(curve.pos[lo].y, curve.pos[hi].y, t) },
    dir: unit({ x: lerp(curve.dir[lo].x, curve.dir[hi].x, t), y: lerp(curve.dir[lo].y, curve.dir[hi].y, t) }),
    room: Math.min(curve.room[lo], curve.room[hi]),
  };
}

interface Side {
  indices: number[]; // ring indices, base -> apex
  direction: 1 | -1; // ring direction the side is walked in
  outwardSign: number;
  anchors: Anchor[]; // ascending along the side
  curve: Curve;
}

interface Sample {
  s: number;
  phase: number;
  tooth: number;
  anchor: number; // side index of the anchor this sample is, or -1
}

// Lay the tooth profile along the smooth outline like a thread.
// The ring is split at its base and apex into two sides.
// Each side into stretches between anchors (base, apex, the pinned vein points and sharp corners).
// Every stretch gets a whole number of teeth.
// Points are then generated fresh at fixed phases of the tooth wave and pushed out along the outline normal.
// So every tooth has the same shape no matter where the old ring points happened to be.
function addTeeth(
  ring: Point[],
  pins: OutlinePin[],
  config: MarginConfig,
  params: MarginParams,
  subdivisions: number,
): { ring: Point[]; originalIndex: number[] } | null {
  const n = ring.length;
  if (n < 6 || !(params.toothHeight > 0)) return null;
  const toothCount = Math.max(1, Math.round(params.toothCount));

  let twiceArea = 0;
  for (let i = 0; i < n; i++) twiceArea += ring[i].x * ring[(i + 1) % n].y - ring[(i + 1) % n].x * ring[i].y;
  const ringIsCcw = twiceArea >= 0;

  const pinDirection = new Map(pins.filter((p) => p.index >= 0 && p.index < n).map((p) => [p.index, p.direction]));
  // Base and apex are the lowest and highest points on the mirror axis, so a lateral tip that
  // hangs lower or reaches higher doesn't split the ring off-axis; the root pin is always the base.
  const onAxis = (i: number) => Math.abs(ring[i].x) <= AXIS_EPS;
  let baseIdx = -1;
  let apexIdx = -1;
  for (let i = 0; i < n; i++) {
    if (!onAxis(i)) continue;
    if (baseIdx < 0 || ring[i].y < ring[baseIdx].y) baseIdx = i;
    if (apexIdx < 0 || ring[i].y > ring[apexIdx].y) apexIdx = i;
  }
  if (baseIdx < 0 || apexIdx < 0) {
    baseIdx = 0;
    apexIdx = 0;
    for (let i = 0; i < n; i++) {
      if (ring[i].y > ring[apexIdx].y) apexIdx = i;
      if (ring[i].y < ring[baseIdx].y) baseIdx = i;
    }
  }
  if (pinDirection.has(0)) baseIdx = 0;
  if (apexIdx === baseIdx) return null;

  const buildSide = (direction: 1 | -1): Side | null => {
    const indices: number[] = [];
    for (let cur = baseIdx; cur !== apexIdx; cur = (cur + direction + n) % n) indices.push(cur);
    indices.push(apexIdx);
    const q = indices.map((i) => ring[i]);
    const m = q.length;
    if (m < 2) return null;
    const outwardSign = (ringIsCcw ? 1 : -1) * direction;

    const along = [0];
    for (let i = 0; i + 1 < m; i++) along.push(along[i] + dist(q[i], q[i + 1]));
    if (along[m - 1] < 1e-6) return null;
    // Corners are measured over a window, so two ring points nearly on top of each other don't
    // fake one.
    const minGap = along[m - 1] / toothCount / 12;
    const tangentBefore = (i: number) => {
      let j = i;
      while (j > 0 && along[i] - along[j] < minGap) j--;
      return unit(sub(q[i], q[j]));
    };
    const tangentAfter = (i: number) => {
      let j = i;
      while (j < m - 1 && along[j] - along[i] < minGap) j++;
      return unit(sub(q[j], q[i]));
    };

    // Anchors: sharp corners (a concave one is a notch) and the pinned vein points, which are
    // peaks unless their vein grazes the outline (then a tooth there would turn the vein).
    const anchors: Anchor[] = [{ at: 0, kind: "notch" }];
    for (let i = 1; i < m - 1; i++) {
      const tin = tangentBefore(i);
      const tout = tangentAfter(i);
      const turn = angleBetween(tin, tout);
      const concave = cross2(tin, tout) * outwardSign < 0;
      const isCorner = turn >= CORNER_ANGLE;
      const pin = pinDirection.get(indices[i]);
      if (!isCorner && !pin) continue;
      const normal = outwardNormal(unit(add(tin, tout)), outwardSign);
      const grazing = !!pin && pin.x * normal.x + pin.y * normal.y <= MIN_PIN_RISE;
      anchors.push({ at: i, kind: (concave && isCorner) || grazing ? "notch" : "peak" });
    }
    anchors.push({ at: m - 1, kind: "peak", phase: config.apexPhase });

    const curve = referenceCurve(
      q,
      new Set(anchors.map((a) => a.at)),
      new Set(anchors.filter((a) => a.kind === "notch").map((a) => a.at)),
      outwardSign,
    );
    if (!(curve.length > 1e-6)) return null;
    return { indices, direction, outwardSign, anchors, curve };
  };

  const sides = [buildSide(1), buildSide(-1)];
  if (!sides[0] || !sides[1]) return null;
  const right = sides[0];
  const left = sides[1];

  // Both sides share one wavelength, so a symmetric ring gets symmetric teeth.
  const wavelength = Math.max(right.curve.length, left.curve.length) / toothCount;
  const amplitude = params.toothHeight * wavelength;
  const phases = toothPhases(config.shape, config.peak, subdivisions);

  // Points of the smooth outline a tooth could run into: both reference curves, thinned to about
  // a quarter wavelength. Points within a wavelength along the outline (also around the apex onto
  // the other side) belong to the tooth itself or its neighbors and don't count, unless a notch
  // lies between: across a notch is the other flank of the sinus.
  const obstacles: { pos: Point; side: Side; s: number }[] = [];
  for (const side of [right, left]) {
    const { curve } = side;
    const stride = Math.max(1, Math.floor(wavelength / 4 / (curve.length / (curve.pos.length - 1))));
    for (let k = 0; k < curve.pos.length; k += stride) obstacles.push({ pos: curve.pos[k], side, s: curve.arc[k] });
  }
  const notchArcs = (side: Side) =>
    side.anchors.filter((a) => a.kind === "notch" && a.at > 0).map((a) => side.curve.arc[side.curve.atSide[a.at]]);
  const notches = new Map<Side, number[]>([right, left].map((side) => [side, notchArcs(side)]));
  const sameTooth = (a: Side, sA: number, b: Side, sB: number) => {
    if (a === b) return Math.abs(sA - sB) < wavelength && !notches.get(a)!.some((n) => (n - sA) * (n - sB) < 0);
    const viaApex = a.curve.length - sA + (b.curve.length - sB);
    return viaApex < wavelength && !notches.get(a)!.some((n) => n > sA) && !notches.get(b)!.some((n) => n > sB);
  };
  // Whether a notch lies between two points, so they are on different flanks of a sinus.
  const acrossNotch = (a: Side, sA: number, b: Side, sB: number) =>
    a !== b || notches.get(a)!.some((n) => (n - sA) * (n - sB) < 0);

  const shapeSide = (side: Side): { points: Point[]; samples: Sample[] } => {
    const { curve, anchors, outwardSign } = side;
    const anchorArc = (a: Anchor) => curve.arc[curve.atSide[a.at]];
    const anchorPhase = (a: Anchor) => a.phase ?? (a.kind === "notch" ? 0 : config.peak);
    const normalAt = (s: number) => {
      const here = curveAt(curve, s);
      const normal = outwardNormal(here.dir, outwardSign);
      if (Math.abs(here.pos.x) <= AXIS_EPS) {
        normal.x = 0;
        normal.y = Math.sign(normal.y) || 1;
      }
      return { pos: here.pos, dir: here.dir, normal, room: here.room };
    };

    // A pinned vein point moves along its vein, so the vein gets longer but keeps its direction;
    // its whole tooth leans with it. Leaning drifts the peak along the outline by height × sine
    // of the lean, so the teeth on that side are planned from where the peak ends up, and the
    // flank between them is stretched by the drift its points don't share. The drift is measured
    // against each flank's own direction, since a tip is usually a corner.
    const anchorAlong = new Map<Anchor, Point>();
    const driftAfter = new Map<Anchor, number>();
    const driftBefore = new Map<Anchor, number>();
    for (const a of anchors) {
      const pin = a.kind === "peak" ? pinDirection.get(side.indices[a.at]) : null;
      if (!pin) continue;
      const { normal } = normalAt(anchorArc(a));
      if (pin.x * normal.x + pin.y * normal.y <= MIN_PIN_RISE) continue;
      anchorAlong.set(a, pin);
      const k = curve.atSide[a.at];
      const last = curve.pos.length - 1;
      const after = unit(sub(curve.pos[Math.min(k + 1, last)], curve.pos[Math.min(k, last - 1)]));
      const before = unit(sub(curve.pos[Math.max(k, 1)], curve.pos[Math.max(k - 1, 0)]));
      driftAfter.set(a, amplitude * (pin.x * after.x + pin.y * after.y));
      driftBefore.set(a, amplitude * (pin.x * before.x + pin.y * before.y));
    }

    // Every stretch between two anchors gets the whole number of teeth closest to its length; a
    // tooth is the stretch from one notch to the next, so a peak anchor sits inside a tooth.
    const samples: Sample[] = [];
    let tooth = 0;
    for (let ai = 0; ai + 1 < anchors.length; ai++) {
      const from = anchors[ai];
      const to = anchors[ai + 1];
      const driftFrom = driftAfter.get(from) ?? 0;
      const driftTo = driftBefore.get(to) ?? 0;
      const startArc = anchorArc(from) + Math.max(0, driftFrom);
      const length = Math.max(0, anchorArc(to) + Math.min(0, driftTo) - startArc);
      const phaseFrom = anchorPhase(from);
      const frac = (((anchorPhase(to) - phaseFrom) % 1) + 1) % 1;
      const span = Math.max(0, Math.round(length / wavelength - frac)) + frac;
      if (from.kind === "notch" && ai > 0) tooth++;
      samples.push({ s: anchorArc(from), phase: phaseFrom, tooth, anchor: from.at });
      if (span < 1e-9) continue;
      const end = phaseFrom + span;
      const firstToothEnd = Math.floor(phaseFrom) + 1;
      const lastToothStart = Math.floor(end - 1e-9);
      for (let period = Math.floor(phaseFrom); period < end; period++) {
        for (const phase of phases) {
          const psi = period + phase;
          if (psi <= phaseFrom + 1e-9 || psi >= end - 1e-9) continue;
          if (phase === 0) tooth++;
          const profile = toothProfile(config.shape, config.peak, phase);
          let s = startArc + ((psi - phaseFrom) / span) * length;
          if (driftFrom > 0 && psi < firstToothEnd) s -= driftFrom * profile;
          if (driftTo < 0 && psi > lastToothStart) s -= driftTo * profile;
          samples.push({ s, phase, tooth, anchor: -1 });
        }
      }
    }
    const last = anchors[anchors.length - 1];
    if (last.kind === "notch") tooth++;
    samples.push({ s: anchorArc(last), phase: anchorPhase(last), tooth, anchor: last.at });

    // The direction a tooth moves in: along the vein of the pinned point it holds, else outward.
    const toothAlong = new Map<number, Point>();
    for (const sample of samples) {
      const anchor = sample.anchor >= 0 ? anchors.find((a) => a.at === sample.anchor) : undefined;
      const along = anchor && anchorAlong.get(anchor);
      if (along && !toothAlong.has(sample.tooth)) toothAlong.set(sample.tooth, along);
    }

    // Each tooth is scaled as a whole so it fits into the room its points have: the concave
    // curvature and notches of the outline itself, and every other outline point it moves
    // toward (both may move, so a point stops at the plane halfway between them).
    const at = samples.map((sample) => {
      const here = normalAt(sample.s);
      const anchor = sample.anchor >= 0 ? anchors.find((a) => a.at === sample.anchor) : undefined;
      const own = anchor && anchorAlong.get(anchor);
      let along = own ?? toothAlong.get(sample.tooth) ?? here.normal;
      if (Math.abs(here.pos.x) <= AXIS_EPS) along = { x: 0, y: Math.sign(along.y) || 1 };
      // Room along the normal (curvature, notch wedge, points further along the same flank), of
      // which a leaning tooth only uses the normal share of its height, and room toward other
      // flanks along the direction the tooth actually moves in.
      const profile = toothProfile(config.shape, config.peak, sample.phase);
      const normalShare = along.x * here.normal.x + along.y * here.normal.y;
      const limitBy = (room: number, share: number) =>
        profile * share >= MIN_PROFILE ? (ROOM_SHARE * room) / (profile * share) : Infinity;
      let limit = limitBy(here.room, normalShare);
      for (const obstacle of obstacles) {
        if (sameTooth(side, sample.s, obstacle.side, obstacle.s)) continue;
        const toObstacle = sub(obstacle.pos, here.pos);
        const distance = Math.hypot(toObstacle.x, toObstacle.y);
        if (distance < 1e-9) continue;
        const otherFlank = acrossNotch(side, sample.s, obstacle.side, obstacle.s);
        const dir = otherFlank ? along : here.normal;
        const toward = (toObstacle.x * dir.x + toObstacle.y * dir.y) / distance;
        if (toward > 1e-3) limit = Math.min(limit, limitBy(distance / 2 / toward, otherFlank ? 1 : normalShare));
      }
      return { pos: here.pos, along, limit, profile };
    });
    const toothAmplitude = new Map<number, number>();
    samples.forEach((sample, i) => {
      toothAmplitude.set(sample.tooth, Math.min(toothAmplitude.get(sample.tooth) ?? amplitude, at[i].limit));
    });

    const points = samples.map((sample, i) => {
      const height = (toothAmplitude.get(sample.tooth) ?? amplitude) * at[i].profile;
      return { x: at[i].pos.x + at[i].along.x * height, y: at[i].pos.y + at[i].along.y * height };
    });

    // The flanks next to a tip can hug its vein; the points of the tip's tooth are kept a little
    // off the vein line on their flank's side, or the face between outline and vein collapses.
    const clearance = wavelength * VEIN_CLEARANCE;
    samples.forEach((pinSample, ip) => {
      const anchor = pinSample.anchor >= 0 ? anchors.find((a) => a.at === pinSample.anchor) : undefined;
      const vein = anchor && anchorAlong.get(anchor);
      if (!vein || anchor.at === 0 || anchor.at === side.indices.length - 1) return;
      const tip = points[ip];
      const q = side.indices.map((r) => ring[r]);
      const pinPoint = q[anchor.at];
      // Which side of the vein line each flank lies on, from the nearest point not on the line.
      const flankSign = (step: 1 | -1) => {
        for (let k = anchor.at + step; k >= 0 && k < q.length; k += step) {
          const c = cross2(vein, sub(q[k], pinPoint));
          if (Math.abs(c) > 1e-9) return Math.sign(c);
        }
        return 0;
      };
      let before = flankSign(-1);
      let after = flankSign(1);
      if (!before) before = -after;
      if (!after) after = -before;
      if (!before) return;
      samples.forEach((sample, i) => {
        if (sample.anchor >= 0 || sample.tooth !== pinSample.tooth) return; // anchors stay put
        const rel = sub(points[i], tip);
        if (rel.x * vein.x + rel.y * vein.y > 0) return; // past the tip, no vein there
        const want = i < ip ? before : after;
        const d = cross2(vein, rel);
        if (d * want >= clearance) return;
        const push = want * clearance - d;
        points[i] = { x: points[i].x - vein.y * push, y: points[i].y + vein.x * push };
      });
    });
    return { points, samples };
  };

  const sampleIndexOf = (side: Side, samples: Sample[]) => {
    // Where each side point ended up: its own sample for an anchor, the nearest sample otherwise.
    return side.indices.map((_, i) => {
      const own = samples.findIndex((sample) => sample.anchor === i);
      if (own >= 0) return own;
      const s = side.curve.arc[side.curve.atSide[i]];
      let best = 0;
      samples.forEach((sample, k) => {
        if (Math.abs(sample.s - s) < Math.abs(samples[best].s - s)) best = k;
      });
      return best;
    });
  };

  // Right side base -> apex, then the left side back down; base and apex appear once.
  const { points: rightPoints, samples: rightSamples } = shapeSide(right);
  const { points: leftPoints, samples: leftSamples } = shapeSide(left);
  const out = [...rightPoints, ...leftPoints.slice(1, -1).reverse()];

  const originalIndex = new Array<number>(n).fill(0);
  sampleIndexOf(right, rightSamples).forEach((sampleIdx, i) => (originalIndex[right.indices[i]] = sampleIdx));
  sampleIndexOf(left, leftSamples).forEach((sampleIdx, i) => {
    const ringIdx = left.indices[i];
    if (ringIdx === baseIdx) originalIndex[ringIdx] = 0;
    else if (ringIdx === apexIdx) originalIndex[ringIdx] = rightPoints.length - 1;
    else originalIndex[ringIdx] = rightPoints.length + leftPoints.length - 2 - sampleIdx;
  });
  return { ring: out, originalIndex };
}

/** The margin as an OutlineShaper. `undefined` for an entire margin. */
export function marginOutlineShaper(
  marginType: LeafMargin | undefined,
  params: MarginParams,
  subdivisions = 6,
): OutlineShaper | undefined {
  const config = marginConfig(marginType);
  if (!config) return undefined;
  return (ring, pins) =>
    addTeeth(ring, pins, config, params, subdivisions) ?? {
      ring: ring.map((p) => ({ x: p.x, y: p.y })),
      originalIndex: ring.map((_, i) => i),
    };
}

/** The toothed outline itself, as drawn by the 2D editor's margin preview. `pins` are the ring
 *  indices that touch the vein tree (see `outlinePins`); without them only base and apex are fixed. */
export function applyMarginTeethToOutline(
  points: Point[],
  marginType: LeafMargin | undefined,
  params: MarginParams,
  pins: OutlinePin[] = [],
  subdivisions?: number,
): Point[] {
  const shaper = marginOutlineShaper(marginType, params, subdivisions);
  return shaper ? shaper(points, pins).ring : points;
}
