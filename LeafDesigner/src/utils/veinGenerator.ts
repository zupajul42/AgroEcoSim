import { MeshData, Point, VeinData, VeinGenParams, VeinNode } from "../types/leaf";
import { clamp01, cross, dist, lerp, perimeter, segmentsCross, size, smoothstep } from "./math";
import { newId } from "./random";

type Point3 = Point & { z: number };
type KeyPoint = Point & { curvature: number };

export const DEFAULT_VEIN_PARAMS: VeinGenParams = {
  lobeDepth: 0.15,
  lobeThreshold: 0.15,
  tipOffset: 0.15,
  lateralOffset: 0,
  curvature: 0.5,
  subdivisions: 6,
};

export const MAX_ROTATION_DEG = 180;

// How much the outline widens just past the base when the tree starts as a single stem.
const BASE_WIDTH = 0.25;
// A point this close to x = 0 counts as sitting on the mirror axis.
const AXIS_EPS = 0.001;
// Below this a triangle counts as having no area.
const FLAT_AREA_EPS = 1e-7;

// The notch between two sibling veins stays sharper than the tips.
const sinusCurvature = (roundness: number) => roundness * 0.35;
const round = (v: number) => Math.round(v * 10000) / 10000;

// --- VEIN TREE ---

export function createVeinNode(x: number, y: number, children: VeinNode[] = [], id?: string): VeinNode {
  return { id: id || newId("vein-"), x: round(x), y: round(y), children };
}

export function findVeinNode(root: VeinNode, id: string): VeinNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findVeinNode(child, id);
    if (found) return found;
  }
  return null;
}

/** New tree with the node `id` replaced by `updater(node)`. */
export function updateVeinTree(root: VeinNode, id: string, updater: (node: VeinNode) => VeinNode): VeinNode {
  if (root.id === id) return updater(root);
  return { ...root, children: root.children.map((c) => updateVeinTree(c, id, updater)) };
}

export function addVeinChild(root: VeinNode, parentId: string, newNode: VeinNode): VeinNode {
  return updateVeinTree(root, parentId, (node) => ({ ...node, children: [...node.children, newNode] }));
}

/** New tree without the node `id` and its subtree. The root can't be removed. */
export function removeVeinNode(root: VeinNode, id: string): VeinNode {
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => removeVeinNode(c, id)) };
}

function subtreeIds(node: VeinNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: VeinNode) => {
    ids.add(n.id);
    n.children.forEach(walk);
  };
  walk(node);
  return ids;
}

/** Merges node `id` into the closest other node within `threshold`, keeping its children. */
export function mergeNearbyVeinNode(
  root: VeinNode,
  id: string,
  threshold: number,
): { root: VeinNode; mergedInto: string | null } {
  const node = findVeinNode(root, id);
  if (!node || id === root.id) return { root, mergedInto: null };

  const excluded = subtreeIds(node);
  let closest: VeinNode | null = null;
  let closestDist = threshold;
  const walk = (n: VeinNode) => {
    if (!excluded.has(n.id) && dist(n, node) <= closestDist) {
      closest = n;
      closestDist = dist(n, node);
    }
    n.children.forEach(walk);
  };
  walk(root);
  if (!closest) return { root, mergedInto: null };

  const targetId = (closest as VeinNode).id;
  let nextRoot = removeVeinNode(root, id);
  node.children.forEach((child) => {
    nextRoot = addVeinChild(nextRoot, targetId, child);
  });
  return { root: nextRoot, mergedInto: targetId };
}

/** Every (parent, node) edge of the tree. */
export function flattenVeinEdges(root: VeinNode): { parent: VeinNode; node: VeinNode }[] {
  const edges: { parent: VeinNode; node: VeinNode }[] = [];
  const walk = (node: VeinNode, parent: VeinNode | null) => {
    if (parent) edges.push({ parent, node });
    node.children.forEach((c) => walk(c, node));
  };
  walk(root, null);
  return edges;
}

export function getEffectiveTipParams(node: VeinNode, params: VeinGenParams) {
  return { tipOffset: node.tipOffset ?? params.tipOffset, curvature: node.curvature ?? params.curvature };
}

export function getEffectiveLateralOffset(node: VeinNode, params: VeinGenParams): number {
  return node.lateralOffset ?? params.lateralOffset ?? 0;
}

export function getEffectiveLobeDepth(node: VeinNode, params: VeinGenParams): number {
  return node.lobeDepth ?? params.lobeDepth;
}

export function getEffectiveLobeThreshold(node: VeinNode, params: VeinGenParams): number {
  return node.lobeThreshold ?? params.lobeThreshold ?? 0;
}

// A simple pinnate default: midrib with three side veins.
function defaultVeinData(): VeinData {
  const apex = createVeinNode(0, 2.0, [], "vein-apex");
  const mid3 = createVeinNode(0, 1.5, [createVeinNode(0.4, 1.8, [], "vein-3"), apex], "vein-mid-3");
  const mid2 = createVeinNode(0, 1.0, [createVeinNode(0.7, 1.3, [], "vein-2"), mid3], "vein-mid-2");
  const mid1 = createVeinNode(0, 0.4, [createVeinNode(0.5, 0.6, [], "vein-1"), mid2], "vein-mid-1");
  return { root: createVeinNode(0, 0, [mid1], "vein-root"), params: { ...DEFAULT_VEIN_PARAMS } };
}

/** Whatever was stored, as complete VeinData (missing params filled from the defaults). */
export function ensureVeinData(v: VeinData | null | undefined): VeinData {
  if (!v?.root) return defaultVeinData();
  return { root: v.root, params: { ...DEFAULT_VEIN_PARAMS, ...(v.params || {}) } };
}

type WithLegacyMargin<T> = T & { margin?: number };

/** `veins` with the old `margin` of params and nodes renamed to `tipOffset`, null when there was none. */
export function migrateLegacyMargin(veins: VeinData): VeinData | null {
  let found = false;
  const rename = <T extends { tipOffset?: number }>(o: WithLegacyMargin<T>): T => {
    if (o.margin === undefined) return o;
    found = true;
    const { margin, ...rest } = o;
    return { ...rest, tipOffset: rest.tipOffset ?? margin } as T;
  };
  const walk = (n: WithLegacyMargin<VeinNode>): VeinNode => ({ ...rename(n), children: n.children.map(walk) });
  const root = walk(veins.root);
  const params = veins.params && rename<VeinGenParams>(veins.params);
  return found ? { root, params } : null;
}

// --- OUTLINE ---
// One spline through the base, every tip and every notch between sibling veins, for the right
// half of the leaf; the left half is its mirror.

// Centripetal Catmull-Rom tangents for the segment p1 -> p2, stable for unevenly spaced points.
function splineTangents(p0: Point, p1: Point, p2: Point, p3: Point) {
  const d01 = Math.sqrt(Math.max(dist(p0, p1), 1e-4));
  const d12 = Math.sqrt(Math.max(dist(p1, p2), 1e-4));
  const d23 = Math.sqrt(Math.max(dist(p2, p3), 1e-4));
  const t1 = {
    x: d12 * ((p1.x - p0.x) / d01 - (p2.x - p0.x) / (d01 + d12) + (p2.x - p1.x) / d12),
    y: d12 * ((p1.y - p0.y) / d01 - (p2.y - p0.y) / (d01 + d12) + (p2.y - p1.y) / d12),
  };
  const t2 = {
    x: d12 * ((p2.x - p1.x) / d12 - (p3.x - p1.x) / (d12 + d23) + (p3.x - p2.x) / d23),
    y: d12 * ((p2.y - p1.y) / d12 - (p3.y - p1.y) / (d12 + d23) + (p3.y - p2.y) / d23),
  };
  return { t1, t2 };
}

// Scales a tangent down so it can never overshoot into a loop.
function clampTangent(t: Point, refDist: number): Point {
  const len = Math.hypot(t.x, t.y);
  const maxLen = refDist * 2.5;
  if (len <= maxLen || len < 1e-6) return t;
  return { x: (t.x * maxLen) / len, y: (t.y * maxLen) / len };
}

// Hermite spline through the key points, `samples` points per segment plus the last point.
// A segment's roundness is the mean curvature of its two key points (0.5 = plain Catmull-Rom).
function interpolateSpline(points: KeyPoint[], samples: number): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const stepCount = Math.max(1, Math.round(samples));
  const p = [points[0], ...points, points[points.length - 1]];
  const result: Point[] = [];

  for (let i = 0; i + 3 < p.length; i++) {
    const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const tension = 2 * clamp01((p1.curvature + p2.curvature) / 2);
    const { t1, t2 } = splineTangents(p0, p1, p2, p3);
    const refDist = Math.max(dist(p1, p2), 1e-4);
    const m1 = clampTangent({ x: t1.x * tension, y: t1.y * tension }, refDist);
    const m2 = clampTangent({ x: t2.x * tension, y: t2.y * tension }, refDist);

    for (let s = 0; s < stepCount; s++) {
      const t = s / stepCount;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      result.push({
        x: round(h00 * p1.x + h10 * m1.x + h01 * p2.x + h11 * m2.x),
        y: round(h00 * p1.y + h10 * m1.y + h01 * p2.y + h11 * m2.y),
      });
    }
  }
  const last = points[points.length - 1];
  result.push({ x: round(last.x), y: round(last.y) });
  return result;
}

// `to`, pushed `offset` further along the from -> to direction.
function extendFrom(from: Point, to: Point, offset: number): Point {
  const len = dist(from, to);
  if (len < 0.001) return { x: round(to.x), y: round(to.y) };
  return { x: round(to.x + ((to.x - from.x) / len) * offset), y: round(to.y + ((to.y - from.y) / len) * offset) };
}

function unit(from: Point, to: Point): Point | null {
  const len = dist(from, to);
  return len < 1e-6 ? null : { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
}

// The node pushed `offset` out along the normal of its vein, on both sides. The vein direction
// is the mean of parent -> node and node -> the child continuing most in that direction (for a
// tip just parent -> node), so a kink at a joint doesn't skew it and side branches don't tilt
// it. `entry` is the side the outline walk reaches first (+x for the midrib).
function lateralPoints(parent: Point, node: VeinNode, offset: number): { entry: Point; exit: Point } | null {
  if (offset <= 0.001) return null;
  const inDir = unit(parent, node);
  const outDirs = node.children.map((c) => unit(node, c)).filter((d): d is Point => d !== null);
  const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
  const onward = inDir
    ? outDirs.reduce<Point | null>((best, d) => (!best || dot(d, inDir) > dot(best, inDir) ? d : best), null)
    : outDirs[0];
  const sum = { x: (inDir?.x ?? 0) + (onward?.x ?? 0), y: (inDir?.y ?? 0) + (onward?.y ?? 0) };
  const d = unit({ x: 0, y: 0 }, sum);
  if (!d) return null;
  const normal = { x: d.y * offset, y: -d.x * offset };
  return {
    entry: { x: round(node.x + normal.x), y: round(node.y + normal.y) },
    exit: { x: round(node.x - normal.x), y: round(node.y - normal.y) },
  };
}

// Lobe depth eased in once two sibling veins are more than `threshold` apart (0 disables the gate).
function gatedLobeDepth(lobeDepth: number, siblingGap: number, threshold: number): number {
  if (threshold <= 0) return lobeDepth;
  return lobeDepth * clamp01((siblingGap - threshold) / Math.max(threshold, 0.01));
}

// Two children at the exact same angle from their parent would overlap; the farther one is
// re-nested under the nearer one.
function reparentCollinearChildren(node: VeinNode): VeinNode {
  const children = node.children.map(reparentCollinearChildren);
  const angleOf = (c: VeinNode) => Math.atan2(c.x - node.x, c.y - node.y);

  const groups: VeinNode[][] = [];
  for (const c of children) {
    const group = groups.find((g) => Math.abs(angleOf(g[0]) - angleOf(c)) < 1e-6);
    if (group) group.push(c);
    else groups.push([c]);
  }
  const merged = groups.map((group) => {
    const sorted = [...group].sort((a, b) => dist(node, a) - dist(node, b));
    for (let i = sorted.length - 1; i > 0; i--) {
      sorted[i - 1] = { ...sorted[i - 1], children: [...sorted[i - 1].children, sorted[i]] };
    }
    return sorted[0];
  });
  return { ...node, children: merged };
}

// A key point that knows which tip or which joint's side point (and where that joint is) it is.
type KeyEntry = KeyPoint & { tipId?: string; lateralId?: string; joint?: Point };

// remove lateral points that are inside the leaf polygon
function dropInwardSidePoints(entries: KeyEntry[], root: VeinNode): KeyEntry[] {
  const edges = flattenVeinEdges(root);
  const core = entries.filter((e) => !e.lateralId);
  const mirror = (p: Point): Point => ({ x: -p.x, y: p.y });
  const coreAfter = (k: number): Point => core[k + 1] ?? mirror(core[k].x > AXIS_EPS ? core[k] : core[k - 1]);
  const convex = (a: Point, b: Point, c: Point) => cross(a, b, c) > 0;
  const convexInCore = (k: number) => k > 0 && convex(core[k - 1], core[k], coreAfter(k));

  const kept: KeyEntry[] = [];
  let coreIdx = -1;
  entries.forEach((e) => {
    if (!e.lateralId) {
      coreIdx++;
      kept.push(e);
      return;
    }
    const [prev2, prev] = [kept[kept.length - 2], kept[kept.length - 1]];
    const next: Point & { tipId?: string } = core[coreIdx + 1] ?? mirror(e);
    const bendsPrevTip = !!prev.tipId && convexInCore(coreIdx) && !convex(prev2, prev, e);
    const bendsNextTip = !!next.tipId && convexInCore(coreIdx + 1) && !convex(e, next, coreAfter(coreIdx + 1));
    const crossesVein = edges.some(
      ({ parent, node }) =>
        parent.id !== e.lateralId && node.id !== e.lateralId && segmentsCross(e.joint!, e, parent, node),
    );
    if (e.x > AXIS_EPS && convex(prev, e, next) && !bendsPrevTip && !bendsNextTip && !crossesVein) kept.push(e);
  });
  return kept;
}

// Key points of the right half outline, walking the tree with children sorted by y: the base,
// then every tip (extended by its tip offset) with a notch before each child that has a sibling
// below it, and a side point on each side of a node with a lateral offset: before and after a
// tip's own point, before and after a joint's subtree. `tipKeyIndex` maps each tip id to its key
// point, `lateralKeyIndex` each node id to its side points.
function buildOutlineKeyPoints(root: VeinNode, params: VeinGenParams) {
  const { tipOffset, curvature } = params;
  const entries: KeyEntry[] = [{ x: 0, y: 0, curvature }];

  const indexed = (list: KeyEntry[]) => {
    const tipKeyIndex = new Map<string, number>();
    const lateralKeyIndex = new Map<string, number[]>();
    list.forEach((e, i) => {
      if (e.tipId) tipKeyIndex.set(e.tipId, i);
      if (e.lateralId) lateralKeyIndex.set(e.lateralId, [...(lateralKeyIndex.get(e.lateralId) ?? []), i]);
    });
    const keyPoints: KeyPoint[] = list.map(({ x, y, curvature }) => ({ x, y, curvature }));
    return { keyPoints, tipKeyIndex, lateralKeyIndex };
  };

  if (root.children.length === 0) {
    // Nothing placed yet: a plain oval.
    const w = 0.5 + tipOffset;
    entries.push(
      { x: round(w * BASE_WIDTH * 2), y: 0.5, curvature },
      { x: round(w), y: 1, curvature },
      { x: round(w * 0.6), y: 1.6, curvature },
      { x: 0, y: 2, curvature },
    );
    return indexed(entries);
  }

  // How wide the blade reaches: every node, pushed out by its lateral offset.
  let maxReach = 0.3;
  flattenVeinEdges(root).forEach(({ node }) => {
    maxReach = Math.max(maxReach, Math.abs(node.x) + getEffectiveLateralOffset(node, params));
  });
  // A single stem widens a little right after the base before the first vein.
  if (root.children.length === 1) {
    const baseW = BASE_WIDTH * maxReach;
    if (baseW > 0.01) entries.push({ x: round(baseW), y: round(root.children[0].y * 0.35), curvature });
  }

  const childrenInOutlineOrder = (node: VeinNode, parent: Point | null) => {
    const back = parent ? unit(node, parent) : { x: 0, y: -1 };
    const angle = (c: VeinNode) => {
      const d = unit(node, c);
      if (!d || !back) return 0;
      const a = Math.atan2(back.x * d.y - back.y * d.x, back.x * d.x + back.y * d.y);
      return a < 0 ? a + 2 * Math.PI : a;
    };
    return [...node.children].sort((a, b) => angle(a) - angle(b) || dist(node, a) - dist(node, b));
  };

  const walk = (node: VeinNode, parent: Point | null) => {
    const children = childrenInOutlineOrder(node, parent);
    const lobeDepth = getEffectiveLobeDepth(node, params);
    const lobeThreshold = getEffectiveLobeThreshold(node, params);

    children.forEach((child, idx) => {
      if (idx > 0) {
        const depth = gatedLobeDepth(lobeDepth, dist(children[idx - 1], child), lobeThreshold);
        if (depth > 0.001) {
          // Measured from the last tip or notch: side points may still be dropped.
          const prev = [...entries].reverse().find((e) => !e.lateralId)!;
          entries.push({
            x: round(Math.max(lerp((prev.x + child.x) / 2, node.x, depth), 0)),
            y: round(lerp((prev.y + child.y) / 2, node.y, depth)),
            curvature: sinusCurvature(curvature),
          });
        }
      }
      // The child's own key points, between its side points if it has a lateral offset.
      const side = lateralPoints(node, child, getEffectiveLateralOffset(child, params));
      const sideCurvature = child.curvature ?? curvature;
      if (side) entries.push({ ...side.entry, curvature: sideCurvature, lateralId: child.id, joint: child });
      if (child.children.length === 0) {
        const tip = getEffectiveTipParams(child, params);
        entries.push({ ...extendFrom(node, child, tip.tipOffset), curvature: tip.curvature, tipId: child.id });
      } else {
        walk(child, node);
      }
      if (side && Math.abs(child.x) > AXIS_EPS) {
        entries.push({ ...side.exit, curvature: sideCurvature, lateralId: child.id, joint: child });
      }
    });
  };
  walk(root, null);
  return indexed(dropInwardSidePoints(entries, root));
}

// Where the segments a-b and c-d cross (they must, see `segmentsCross`).
function crossingPoint(a: Point, b: Point, c: Point, d: Point): Point {
  const denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom;
  return { x: round(lerp(a.x, b.x, t)), y: round(lerp(a.y, b.y, t)) };
}

function halfOutline(keyPoints: KeyPoint[], subdivisions: number, protect: Set<number>) {
  const stepCount = Math.max(1, Math.round(subdivisions));
  const sampled = interpolateSpline(keyPoints, subdivisions).map((p) => (p.x < AXIS_EPS ? { x: 0, y: p.y } : p));
  const protectedIdx = new Set([...protect].map((k) => k * stepCount));

  let half = sampled;
  let origin = sampled.map((_, i) => i);
  for (let i = 0; i < half.length - 1; i++) {
    for (let j = i + 2; j < half.length - 1; j++) {
      if (!segmentsCross(half[i], half[i + 1], half[j], half[j + 1])) continue;
      if (origin.slice(i + 1, j + 1).some((o) => protectedIdx.has(o))) break;
      const x = crossingPoint(half[i], half[i + 1], half[j], half[j + 1]);
      half = [...half.slice(0, i + 1), x, ...half.slice(j + 1)];
      origin = [...origin.slice(0, i + 1), -1, ...origin.slice(j + 1)];
      i--;
      break;
    }
  }
  const keyAt = keyPoints.map((_, k) => origin.indexOf(k * stepCount));
  return { half, keyAt };
}

/** The half outline (base -> apex), mirrored into a closed ring unless `mirrorX` is false. */
export function generateOutlineFromVeins(
  veins: VeinData,
  options: { mirrorX: boolean; params?: VeinGenParams },
): Point[] {
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;
  const { keyPoints, tipKeyIndex } = buildOutlineKeyPoints(reparentCollinearChildren(veins.root), params);
  const { half } = halfOutline(keyPoints, params.subdivisions, new Set(tipKeyIndex.values()));
  return options.mirrorX ? mirrorHalfOutline(half) : half;
}

// Forward along the half, then back along its mirror image, skipping points on the axis.
function mirrorHalfOutline(half: Point[]): Point[] {
  const ring = [...half];
  for (let i = half.length - 1; i >= 0; i--) {
    if (Math.abs(half[i].x) > AXIS_EPS) ring.push({ x: round(-half[i].x), y: half[i].y });
  }
  return ring;
}

// --- MESH ---
// The blade is the outline ring with the vein tree laid inside it. Tips and the side points of
// joints touch the ring; between two neighbors along the ring lies one face, bounded by that
// stretch of outline and the two vein paths back to their common joint; each face is
// triangulated on its own. Bend and fold are applied last as smooth deformations of the flat mesh.

/** Reshapes the flat outline ring before triangulation (margin teeth). May move points and
 *  insert new ones; `originalIndex[i]` is where original point i ended up. */
export type OutlineShaper = (ring: Point[]) => { ring: Point[]; originalIndex: number[] };

// A joint or tip of the (mirrored) vein tree as placed in the mesh.
interface MeshNode {
  vein: VeinNode;
  flat: Point;
  vertex: number;
  alongVein: number[]; // vertices between the parent and this node, parent side first
  parent: MeshNode | null;
  depth: number;
}

function mirrorNode(node: VeinNode): VeinNode {
  return { ...node, x: -node.x, children: node.children.map(mirrorNode) };
}

// Interior angle of the flat triangle at vertex `at`, between `p` and `q`.
function angleAt(pts: Point[], at: number, p: number, q: number): number {
  const dot = (pts[p].x - pts[at].x) * (pts[q].x - pts[at].x) + (pts[p].y - pts[at].y) * (pts[q].y - pts[at].y);
  return Math.abs(Math.atan2(cross(pts[at], pts[p], pts[q]), dot));
}

function minAngle(pts: Point[], a: number, b: number, c: number): number {
  return Math.min(angleAt(pts, a, b, c), angleAt(pts, b, c, a), angleAt(pts, c, a, b));
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = len2 > 0 ? clamp01(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2) : 0;
  return dist(p, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
}

function insidePolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < a.x + ((p.y - a.y) * (b.x - a.x)) / (b.y - a.y)) inside = !inside;
  }
  return inside;
}

// Triangulates one counter-clockwise face polygon plus extra interior points: ear clipping that
// always clips the best-shaped ear, then the interior points are inserted, then Delaunay flips.
// Zero-area ears are only clipped when nothing else is left (a straight vein chain).
function triangulatePolygon(poly: number[], interior: number[], pts: Point[], index: number[]): void {
  if (poly.length < 3) return;
  const isEar = (ring: number[], r: number) => {
    const a = ring[(r - 1 + ring.length) % ring.length];
    const b = ring[r];
    const c = ring[(r + 1) % ring.length];
    if (cross(pts[a], pts[b], pts[c]) < -FLAT_AREA_EPS) return false;
    return ring.every(
      (o) =>
        o === a ||
        o === b ||
        o === c ||
        cross(pts[a], pts[b], pts[o]) <= FLAT_AREA_EPS ||
        cross(pts[b], pts[c], pts[o]) <= FLAT_AREA_EPS ||
        cross(pts[c], pts[a], pts[o]) <= FLAT_AREA_EPS,
    );
  };

  const tris: [number, number, number][] = [];
  const ring = [...poly];
  while (ring.length > 3) {
    let best = 1;
    let bestScore = -1;
    for (let r = 0; r < ring.length; r++) {
      if (!isEar(ring, r)) continue;
      const a = ring[(r - 1 + ring.length) % ring.length];
      const c = ring[(r + 1) % ring.length];
      let score = minAngle(pts, a, ring[r], c);
      // With four left, the leftover is the last triangle and must not be a sliver either.
      if (ring.length === 4) score = Math.min(score, minAngle(pts, c, ring[(r + 2) % 4], a));
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    tris.push([ring[(best - 1 + ring.length) % ring.length], ring[best], ring[(best + 1) % ring.length]]);
    ring.splice(best, 1);
  }
  tris.push([ring[0], ring[1], ring[2]]);

  for (const p of interior) {
    const inside = (t: [number, number, number]) =>
      cross(pts[t[0]], pts[t[1]], pts[p]) >= 0 &&
      cross(pts[t[1]], pts[t[2]], pts[p]) >= 0 &&
      cross(pts[t[2]], pts[t[0]], pts[p]) >= 0;
    const ti = tris.findIndex(inside);
    if (ti < 0) continue;
    const [a, b, c] = tris[ti];
    tris.splice(ti, 1, [a, b, p], [b, c, p], [c, a, p]);
  }

  flipToDelaunay(tris, pts);
  tris.forEach((t) => index.push(...t));
}

// Flips interior edges until every pair of neighboring triangles satisfies the Delaunay condition.
function flipToDelaunay(tris: [number, number, number][], pts: Point[]): void {
  for (let pass = 0; pass < 200; pass++) {
    const byEdge = new Map<string, number[]>();
    tris.forEach((t, ti) => {
      for (let k = 0; k < 3; k++) {
        const key = [t[k], t[(k + 1) % 3]].sort((x, y) => x - y).join(",");
        byEdge.set(key, [...(byEdge.get(key) || []), ti]);
      }
    });

    // Triangles changed in this pass are left alone until the edge map is rebuilt.
    const changed = new Set<number>();
    for (const owners of byEdge.values()) {
      if (owners.length !== 2 || changed.has(owners[0]) || changed.has(owners[1])) continue;
      const t1 = tris[owners[0]];
      const t2 = tris[owners[1]];
      // The shared edge runs u -> v in t1 and v -> u in t2.
      const k = [0, 1, 2].find((i) => t2.includes(t1[i]) && t2.includes(t1[(i + 1) % 3]))!;
      const u = t1[k];
      const v = t1[(k + 1) % 3];
      const w1 = t1.find((x) => x !== u && x !== v)!;
      const w2 = t2.find((x) => x !== u && x !== v)!;
      if (angleAt(pts, w1, u, v) + angleAt(pts, w2, u, v) <= Math.PI + 1e-9) continue;
      if (cross(pts[u], pts[w2], pts[w1]) <= FLAT_AREA_EPS) continue;
      if (cross(pts[w2], pts[v], pts[w1]) <= FLAT_AREA_EPS) continue;
      tris[owners[0]] = [u, w2, w1];
      tris[owners[1]] = [w2, v, w1];
      changed.add(owners[0]).add(owners[1]);
    }
    if (changed.size === 0) return;
  }
}

type Deformer = (q: Point3) => Point3;

// The fold and bend deformers of one vein edge (parent -> child; the root uses the stem straight
// up from the base), null where the angle is zero. Both act on the blade past the parent joint:
// the angle builds up linearly out to the farthest vertex reached, so the blade curls as one arc.
// An on-axis vein reaches the whole width; an off-axis vein reaches its own lobe (the width its
// subtree spans), fading out just beyond it and never crossing the midrib.
// Bend curves the region out of the plane (positive = toward +z). Fold hinges the two sides of
// the vein toward each other; the vein itself stays put (positive lifts both sides toward +z).
function veinDeformers(
  parentFlat: Point,
  childFlat: Point,
  vein: VeinNode,
  ownedPoints: Point[],
  allPoints: Point[],
): { fold: Deformer | null; bend: Deformer | null } {
  const none = { fold: null, bend: null };
  const bend = ((vein.bend ?? 0) * Math.PI) / 180;
  const fold = ((vein.fold ?? 0) * Math.PI) / 180;
  if (Math.abs(bend) < 1e-9 && Math.abs(fold) < 1e-9) return none;

  const len = dist(parentFlat, childFlat);
  if (len < 1e-6) return none;
  const ax = (childFlat.x - parentFlat.x) / len;
  const ay = (childFlat.y - parentFlat.y) / len;
  const along = (p: Point) => (p.x - parentFlat.x) * ax + (p.y - parentFlat.y) * ay;
  const across = (p: Point) => (p.x - parentFlat.x) * ay - (p.y - parentFlat.y) * ax;

  const onAxis = Math.abs(parentFlat.x) <= AXIS_EPS && Math.abs(childFlat.x) <= AXIS_EPS;
  const side = Math.sign(Math.abs(childFlat.x) > AXIS_EPS ? childFlat.x : parentFlat.x);
  let halfWidth = 0.15 * len;
  for (const p of ownedPoints) halfWidth = Math.max(halfWidth, Math.abs(across(p)));
  const weight = (p: Point) => {
    if (onAxis) return 1;
    if (Math.abs(p.x) <= AXIS_EPS || Math.sign(p.x) !== side) return 0;
    return 1 - smoothstep((Math.abs(across(p)) - halfWidth) / (0.6 * halfWidth));
  };

  let reach = 0;
  for (const p of allPoints) if (along(p) > 0 && weight(p) > 0) reach = Math.max(reach, along(p));
  if (reach < 1e-6) return none;

  const place = (outAlong: number, l: number, up: number): Point3 => ({
    x: parentFlat.x + outAlong * ax + l * ay,
    y: parentFlat.y + outAlong * ay - l * ax,
    z: up,
  });

  const foldDeformer: Deformer = (q) => {
    const a = along(q);
    const w = weight(q);
    const l = across(q);
    if (a <= 0 || w <= 0 || l === 0) return q;
    const t = (Math.sign(l) * fold * Math.min(a, reach) * w) / reach;
    return place(a, l * Math.cos(t) - q.z * Math.sin(t), l * Math.sin(t) + q.z * Math.cos(t));
  };

  const bendDeformer: Deformer = (q) => {
    const a = along(q);
    const w = weight(q);
    if (a <= 0 || w <= 0) return q;
    // Circular arc of curvature k; a point at height z rides the arc of radius r - z.
    const k = (bend * w) / reach;
    const r = 1 / k;
    const phi = k * Math.min(a, reach);
    let outAlong = (r - q.z) * Math.sin(phi);
    let up = r - (r - q.z) * Math.cos(phi);
    if (a > reach) {
      outAlong += (a - reach) * Math.cos(bend * w);
      up += (a - reach) * Math.sin(bend * w);
    }
    return place(outAlong, across(q), up);
  };

  return { fold: fold !== 0 ? foldDeformer : null, bend: bend !== 0 ? bendDeformer : null };
}

/** The blade mesh over the vein tree: flat triangulation, then bend and fold. */
export function generateVeinMesh(
  veins: VeinData,
  options: { mirrorX?: boolean; params?: VeinGenParams; shapeOutline?: OutlineShaper } = {},
): MeshData {
  const mirrorX = options.mirrorX !== false;
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;
  const root = reparentCollinearChildren(veins.root);
  if (root.children.length === 0) return { position: [], index: [] };

  const index: number[] = [];
  const points: Point[] = [];
  const owners: MeshNode[] = [];
  const addVertex = (flat: Point, owner: MeshNode) => {
    points.push(flat);
    owners.push(owner);
    return points.length - 1;
  };

  // `keyAt[k]` is where key point k sits in the half outline; that's how a tip or a joint's side
  // point finds its ring point. A side point cut off with an overlapping lobe has none.
  const { keyPoints, tipKeyIndex, lateralKeyIndex } = buildOutlineKeyPoints(root, params);
  const { half, keyAt } = halfOutline(keyPoints, params.subdivisions, new Set(tipKeyIndex.values()));

  // The ring, built like `mirrorHalfOutline` but tracked per point.
  const ringPoints = half.map((_, i) => ({ halfIdx: i, mirrored: false }));
  const mirroredRingPos = new Map<number, number>();
  if (mirrorX) {
    for (let i = half.length - 1; i >= 0; i--) {
      if (Math.abs(half[i].x) > AXIS_EPS) {
        mirroredRingPos.set(i, ringPoints.length);
        ringPoints.push({ halfIdx: i, mirrored: true });
      }
    }
  }
  const flatRing = ringPoints.map(({ halfIdx, mirrored }) => ({
    x: mirrored ? -half[halfIdx].x : half[halfIdx].x,
    y: half[halfIdx].y,
  }));
  const shaped = options.shapeOutline?.(flatRing) ?? { ring: flatRing, originalIndex: flatRing.map((_, i) => i) };
  const outline = shaped.ring;

  // Interior spacing (along veins and the grid): twice the untoothed ring's own point spacing,
  // so `subdivisions` alone controls the density; never finer than 1% of the leaf.
  const step = Math.max((2 * perimeter(flatRing)) / flatRing.length, size(flatRing) / 100);
  if (!(step > 0)) return { position: [], index: [] };
  const verticesBetween = (from: Point, to: Point, owner: MeshNode) => {
    const segments = Math.max(1, Math.round(dist(from, to) / step));
    const vertices: number[] = [];
    for (let s = 1; s < segments; s++) {
      vertices.push(addVertex({ x: lerp(from.x, to.x, s / segments), y: lerp(from.y, to.y, s / segments) }, owner));
    }
    return vertices;
  };

  // 1. The mirrored tree. Tips and side points are pinned to the ring in step 2, once it is final.
  const meshRoot: MeshNode = { vein: root, flat: { x: 0, y: 0 }, vertex: -1, alongVein: [], parent: null, depth: 0 };
  meshRoot.vertex = addVertex(meshRoot.flat, meshRoot);
  type Pin = { node: MeshNode; halfIdx: number; mirrored: boolean };
  const pins: Pin[] = [];
  const childrenFirst: MeshNode[] = [];

  const walk = (vein: VeinNode, node: MeshNode, mirrored: boolean) => {
    const mirrorHere = mirrorX && !mirrored && Math.abs(vein.x) <= AXIS_EPS;
    const visit = (child: VeinNode, childMirrored: boolean) => {
      const childNode: MeshNode = {
        vein: child,
        flat: { x: child.x, y: child.y },
        vertex: -1,
        alongVein: [],
        parent: node,
        depth: node.depth + 1,
      };
      if (child.children.length === 0) {
        pins.push({ node: childNode, halfIdx: keyAt[tipKeyIndex.get(child.id)!], mirrored: childMirrored });
      } else {
        childNode.alongVein = verticesBetween(node.flat, childNode.flat, childNode);
        childNode.vertex = addVertex(childNode.flat, childNode);
        // A joint on the axis is never mirrored itself, but its side point reaches both halves. A
        // tip's side points are plain ring points of the faces next to it and need no node here.
        for (const halfIdx of (lateralKeyIndex.get(child.id) ?? []).map((k) => keyAt[k])) {
          if (halfIdx < 0) continue;
          pins.push({ node: childNode, halfIdx, mirrored: childMirrored });
          if (mirrorHere && Math.abs(child.x) <= AXIS_EPS) pins.push({ node: childNode, halfIdx, mirrored: true });
        }
        walk(child, childNode, childMirrored);
      }
      childrenFirst.push(childNode);
    };
    for (const child of vein.children) {
      visit(child, mirrored);
      if (mirrorHere && Math.abs(child.x) > AXIS_EPS) visit(mirrorNode(child), true);
    }
  };
  walk(root, meshRoot, false);
  childrenFirst.push(meshRoot);

  // 2. Everything touching the ring, in ring order: right half forward, mirrored ones backward.
  // A tip moves onto its ring point; a joint stays on its vein and gets a short path `toRing`
  // from its vertex to its own vertex on the ring.
  type RingNode = { node: MeshNode; ringPos: number; mirrored: boolean; ringVertex: number; toRing: number[] };
  const pin = ({ node, mirrored }: Pin, unshapedPos: number): RingNode => {
    const ringPos = shaped.originalIndex[unshapedPos];
    if (node.vein.children.length === 0) {
      node.flat = outline[ringPos];
      node.alongVein = verticesBetween(node.parent!.flat, node.flat, node);
      node.vertex = addVertex(outline[ringPos], node);
      return { node, ringPos, mirrored, ringVertex: node.vertex, toRing: [] };
    }
    const toRing = verticesBetween(node.flat, outline[ringPos], node);
    return { node, ringPos, mirrored, ringVertex: addVertex(outline[ringPos], node), toRing };
  };
  const ringNodes: RingNode[] = [
    { node: meshRoot, ringPos: shaped.originalIndex[0], mirrored: false, ringVertex: meshRoot.vertex, toRing: [] },
    ...pins
      .filter((p) => !p.mirrored)
      .sort((a, b) => a.halfIdx - b.halfIdx)
      .map((p) => pin(p, p.halfIdx)),
    ...pins
      .filter((p) => p.mirrored && mirroredRingPos.has(p.halfIdx))
      .sort((a, b) => b.halfIdx - a.halfIdx)
      .map((p) => pin(p, mirroredRingPos.get(p.halfIdx)!)),
  ];

  // 3. One face per pair of neighboring ring nodes.
  const commonJoint = (a: MeshNode, b: MeshNode) => {
    while (a !== b) {
      if (a.depth >= b.depth) a = a.parent!;
      else b = b.parent!;
    }
    return a;
  };
  // From the ring back up to (not including) `stop`: a joint's ring vertex and `toRing` first,
  // then vertex and `alongVein` of every node on the way.
  const pathUpTo = (from: RingNode, stop: MeshNode) => {
    const out = from.ringVertex === from.node.vertex ? [] : [from.ringVertex, ...[...from.toRing].reverse()];
    for (let n = from.node; n !== stop; n = n.parent!) out.push(n.vertex, ...[...n.alongVein].reverse());
    return out;
  };

  ringNodes.forEach((a, s) => {
    const b = ringNodes[(s + 1) % ringNodes.length];
    const joint = commonJoint(a.node, b.node);

    const arcPoints: Point[] = [];
    for (let r = (a.ringPos + 1) % outline.length; r !== b.ringPos; r = (r + 1) % outline.length) {
      arcPoints.push(outline[r]);
    }

    // Outline points belong to one of the two lobes, switching at the notch (the point closest
    // to the joint), which goes with the lower tip on both halves. Next to the common joint
    // itself (the root, or a joint reaching the ring with a side point) everything goes with
    // the other node.
    let belongsToA: (i: number) => boolean = () => false;
    if (b.node === joint) belongsToA = () => true;
    else if (a.node !== joint) {
      let notch = -1;
      let best = Infinity;
      arcPoints.forEach((p, i) => {
        if (dist(p, joint.flat) < best) {
          best = dist(p, joint.flat);
          notch = i;
        }
      });
      belongsToA = a.mirrored || b.mirrored ? (i) => i < notch : (i) => i <= notch;
    }
    const arc = arcPoints.map((p, i) => addVertex(p, belongsToA(i) ? a.node : b.node));

    const poly = [joint.vertex, ...pathUpTo(a, joint).reverse(), ...arc, ...pathUpTo(b, joint)];

    // Interior points on a grid with columns on the axis (so both halves get the same points),
    // kept clear of the face's own boundary.
    const polyPts = poly.map((v) => points[v]);
    const gridStart = (min: number, offset: number) => (Math.floor(min / step) + offset) * step;
    const clearOfBoundary = (p: Point) =>
      polyPts.every((q, i) => distToSegment(p, q, polyPts[(i + 1) % polyPts.length]) > step / 2);
    const interior: number[] = [];
    const minX = Math.min(...polyPts.map((p) => p.x));
    const maxX = Math.max(...polyPts.map((p) => p.x));
    const minY = Math.min(...polyPts.map((p) => p.y));
    const maxY = Math.max(...polyPts.map((p) => p.y));
    for (let y = gridStart(minY, 0.5); y < maxY; y += step) {
      for (let x = gridStart(minX, 0); x < maxX; x += step) {
        const p = { x, y };
        if (insidePolygon(p, polyPts) && clearOfBoundary(p)) interior.push(addVertex(p, joint));
      }
    }
    triangulatePolygon(poly, interior, points, index);
  });

  // 4. All folds first, then all bends, children before parents so a parent carries its
  // already-shaped subtree along. A fold after a bend would shear apart the lifted region.
  const inSubtree = (owner: MeshNode, node: MeshNode) => {
    for (let n: MeshNode | null = owner; n && n.depth >= node.depth; n = n.parent) if (n === node) return true;
    return false;
  };
  const parts = childrenFirst.map((node) =>
    veinDeformers(
      node.parent?.flat ?? { x: 0, y: -1 },
      node.flat,
      node.vein,
      points.filter((_, v) => inSubtree(owners[v], node)),
      points,
    ),
  );
  const deformers = [...parts.map((p) => p.fold), ...parts.map((p) => p.bend)].filter((d): d is Deformer => d !== null);

  const position: number[] = [];
  for (const flat of points) {
    let p: Point3 = { x: flat.x, y: flat.y, z: 0 };
    for (const deform of deformers) p = deform(p);
    position.push(p.x, p.y, p.z);
  }
  return { position, index };
}
