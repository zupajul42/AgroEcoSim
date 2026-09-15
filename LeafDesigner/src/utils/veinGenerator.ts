import { VeinData, VeinNode, VeinGenParams } from "../types/leaf";

export type Point = { x: number; y: number };
type Point3 = { x: number; y: number; z: number };
type KeyPoint = Point & { curvature: number };

export const DEFAULT_VEIN_PARAMS: VeinGenParams = {
  lobeDepth: 0.15,
  lobeThreshold: 0.15,
  margin: 0.15,
  curvature: 0.5,
  subdivisions: 6,
};

export const MAX_ROTATION_DEG = 180;

// How much the outline widens just past the base when the tree starts as a single stem.
const BASE_WIDTH = 0.25;
// A point this close to x = 0 counts as sitting on the mirror axis.
const AXIS_EPS = 0.001;
// Below this a flat triangle counts as having no area.
const FLAT_AREA_EPS = 1e-7;

// The notch between two sibling veins stays sharper than the tips' roundness — a real sinus is a cusp.
const sinusCurvature = (roundness: number) => roundness * 0.35;
const round = (v: number) => Math.round(v * 10000) / 10000;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const smoothstep = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
/** Twice the signed area of (a, b, c) — positive when counter-clockwise. */
const cross2 = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);

// --- VEIN TREE ---

export function createVeinNode(x: number, y: number, children: VeinNode[] = [], id?: string): VeinNode {
  return { id: id || "vein-" + Math.random().toString(36).slice(2, 9), x: round(x), y: round(y), children };
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

/**
 * Merges 2 vein points on the same "layer" within threshold.
 * Lets two dragged-together vein tips snap into one instead of pinching the outline.
 */
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
  return { margin: node.margin ?? params.margin, curvature: node.curvature ?? params.curvature };
}

export function getEffectiveLobeDepth(node: VeinNode, params: VeinGenParams): number {
  return node.lobeDepth ?? params.lobeDepth;
}

export function getEffectiveLobeThreshold(node: VeinNode, params: VeinGenParams): number {
  return node.lobeThreshold ?? params.lobeThreshold ?? 0;
}

/** A simple pinnate default: midrib with three side veins. */
export function getDefaultVeinData(): VeinData {
  const apex = createVeinNode(0, 2.0, [], "vein-apex");
  const mid3 = createVeinNode(0, 1.5, [createVeinNode(0.4, 1.8, [], "vein-3"), apex], "vein-mid-3");
  const mid2 = createVeinNode(0, 1.0, [createVeinNode(0.7, 1.3, [], "vein-2"), mid3], "vein-mid-2");
  const mid1 = createVeinNode(0, 0.4, [createVeinNode(0.5, 0.6, [], "vein-1"), mid2], "vein-mid-1");
  return { root: createVeinNode(0, 0, [mid1], "vein-root"), params: { ...DEFAULT_VEIN_PARAMS } };
}

/** Whatever was stored, as complete VeinData (missing params filled from the defaults). */
export function ensureVeinData(v: VeinData | null | undefined): VeinData {
  if (!v?.root) return getDefaultVeinData();
  return { root: v.root, params: { ...DEFAULT_VEIN_PARAMS, ...(v.params || {}) } };
}

// --- OUTLINE ---
// A single Catmull-Rom spline through the base, every tip (pushed out by its margin) and the
// sinus between neighboring veins, for one half of the leaf; the other half is its mirror.

/** Centripetal Catmull-Rom tangents for the segment p1 -> p2: stable for unevenly spaced points. */
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

/** Scales a tangent down so it can never overshoot into a loop. */
function clampTangent(t: Point, refDist: number): Point {
  const len = Math.hypot(t.x, t.y);
  const maxLen = refDist * 2.5;
  if (len <= maxLen || len < 1e-6) return t;
  return { x: (t.x * maxLen) / len, y: (t.y * maxLen) / len };
}

/**
 * Hermite spline through the key points, `samples` points per segment plus the last point.
 * A segment's roundness is the average of its two key points' curvature (0 = straight,
 * 0.5 = standard Catmull-Rom, 1 = twice the bulge).
 */
function interpolateSpline(points: KeyPoint[], samples: number): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));
  const stepCount = Math.max(1, Math.round(samples));
  const p = [points[0], ...points, points[points.length - 1]];
  const result: Point[] = [];

  for (let i = 0; i + 3 < p.length; i++) {
    const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const tension = 2 * Math.max(0, Math.min(1, (p1.curvature + p2.curvature) / 2));
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

/** `to`, pushed `margin` further along the from -> to direction. */
function extendFrom(from: Point, to: Point, margin: number): Point {
  const len = dist(from, to);
  if (len < 0.001) return { x: round(to.x), y: round(to.y) };
  return { x: round(to.x + ((to.x - from.x) / len) * margin), y: round(to.y + ((to.y - from.y) / len) * margin) };
}

/** Lobe depth eased in once two sibling veins are more than `threshold` apart (0 disables the gate). */
function gatedLobeDepth(lobeDepth: number, siblingGap: number, threshold: number): number {
  if (threshold <= 0) return lobeDepth;
  return lobeDepth * Math.max(0, Math.min(1, (siblingGap - threshold) / Math.max(threshold, 0.01)));
}

/**
 * Two children at the exact same angle from their parent (a vein running straight on, with a
 * side vein authored as a separate child instead of nested in that run) would overlap. The
 * farther one is re-nested under the nearer one, which every routine here handles naturally.
 */
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

/**
 * Key points of the un-mirrored half outline, walking the tree with children sorted by y:
 * the base, then every tip (extended by its margin) with a sinus point before each child that
 * has a sibling below it. `tipKeyIndex` maps each tip id to its key point.
 */
function buildOutlineKeyPoints(root: VeinNode, params: VeinGenParams) {
  const { margin, curvature } = params;
  const keyPoints: KeyPoint[] = [{ x: 0, y: 0, curvature }];
  const tipKeyIndex = new Map<string, number>();

  if (root.children.length === 0) {
    // Nothing placed yet: a plain oval.
    const w = 0.5 + margin;
    keyPoints.push(
      { x: round(w * BASE_WIDTH * 2), y: 0.5, curvature },
      { x: round(w), y: 1, curvature },
      { x: round(w * 0.6), y: 1.6, curvature },
      { x: 0, y: 2, curvature },
    );
    return { keyPoints, tipKeyIndex };
  }

  let maxTipX = 0.3;
  flattenVeinEdges(root).forEach(({ node }) => {
    if (node.children.length === 0) maxTipX = Math.max(maxTipX, Math.abs(node.x));
  });
  // A single stem widens a little right after the base before the first vein.
  if (root.children.length === 1) {
    const baseW = BASE_WIDTH * maxTipX;
    if (baseW > 0.01) keyPoints.push({ x: round(baseW), y: round(root.children[0].y * 0.35), curvature });
  }

  const walk = (node: VeinNode) => {
    const children = [...node.children].sort((a, b) => a.y - b.y);
    const lobeDepth = getEffectiveLobeDepth(node, params);
    const lobeThreshold = getEffectiveLobeThreshold(node, params);

    children.forEach((child, idx) => {
      if (idx > 0) {
        const depth = gatedLobeDepth(lobeDepth, dist(children[idx - 1], child), lobeThreshold);
        if (depth > 0.001) {
          const prev = keyPoints[keyPoints.length - 1];
          keyPoints.push({
            x: round(Math.max(lerp((prev.x + child.x) / 2, node.x, depth), 0)),
            y: round(lerp((prev.y + child.y) / 2, node.y, depth)),
            curvature: sinusCurvature(curvature),
          });
        }
      }
      if (child.children.length === 0) {
        const tip = getEffectiveTipParams(child, params);
        keyPoints.push({ ...extendFrom(node, child, tip.margin), curvature: tip.curvature });
        tipKeyIndex.set(child.id, keyPoints.length - 1);
      } else {
        walk(child);
      }
    });
  };
  walk(root);
  return { keyPoints, tipKeyIndex };
}

/** The half outline (base -> apex), mirrored into a closed ring unless `mirrorX` is false. */
export function generateOutlineFromVeins(veins: VeinData, options: { mirrorX: boolean; params?: VeinGenParams }): Point[] {
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;
  const { keyPoints } = buildOutlineKeyPoints(reparentCollinearChildren(veins.root), params);
  const half = interpolateSpline(keyPoints, params.subdivisions);
  return options.mirrorX ? mirrorHalfOutline(half) : half;
}

/** Forward along the half, then back along its mirror image, skipping points on the axis. */
function mirrorHalfOutline(half: Point[]): Point[] {
  const ring = [...half];
  for (let i = half.length - 1; i >= 0; i--) {
    if (Math.abs(half[i].x) > AXIS_EPS) ring.push({ x: round(-half[i].x), y: half[i].y });
  }
  return ring;
}

// --- MESH ---
// The blade is the outline ring above with the vein tree laid inside it: every joint is a
// vertex, every tip is pinned to its point on the ring. Between two tips that are neighbors
// along the ring lies one face — bounded by that stretch of outline and the two vein paths
// back to the tips' common ancestor joint — which is triangulated on its own. Off-axis
// branches of an on-axis joint are mirrored to make the left half. Bend and fold are applied
// last, as smooth deformations of the finished flat mesh.

export interface VeinMesh {
  position: number[];
  index: number[];
}

/**
 * Reshapes the flat outline ring before the blade is triangulated over it (margin teeth). It
 * may move points and insert new ones between them, and reports where each original point
 * ended up so every tip stays pinned to its own outline point.
 */
export type OutlineShaper = (ring: Point[]) => { ring: Point[]; originalIndex: number[] };

/** A joint or tip of the mirror-augmented tree as placed in the mesh. */
interface AugNode {
  node: VeinNode;
  flat: Point;
  vertex: number;
  /** Vertices along the vein edge from the parent to this node (parent side first), so the
   *  interior is sampled as densely as the outline instead of everything meeting at the joint. */
  strut: number[];
  parent: AugNode | null;
  depth: number;
}

function mirrorNode(node: VeinNode): VeinNode {
  return { ...node, x: -node.x, children: node.children.map(mirrorNode) };
}

/** Smallest interior angle of the flat triangle (a, b, c). */
function minAngle(pts: Point[], a: number, b: number, c: number): number {
  const angleAt = (p: number, q: number, r: number) =>
    Math.abs(
      Math.atan2(
        cross2(pts[p], pts[q], pts[r]),
        (pts[q].x - pts[p].x) * (pts[r].x - pts[p].x) + (pts[q].y - pts[p].y) * (pts[r].y - pts[p].y),
      ),
    );
  return Math.min(angleAt(a, b, c), angleAt(b, c, a), angleAt(c, a, b));
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2)) : 0;
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

/**
 * Triangulates one face polygon (counter-clockwise vertex indices) with extra interior points:
 * ear clipping that always clips the best-shaped ear first, then the interior points are
 * inserted, then Delaunay edge flips — so triangles spread evenly over the face instead of
 * fanning out of a few vertices. Zero-area ears are only clipped when nothing else is left (a
 * straight vein chain through a joint).
 */
function triangulatePolygon(poly: number[], interior: number[], pts: Point[], index: number[]): void {
  if (poly.length < 3) return;
  const isEar = (ring: number[], r: number) => {
    const a = ring[(r - 1 + ring.length) % ring.length];
    const b = ring[r];
    const c = ring[(r + 1) % ring.length];
    if (cross2(pts[a], pts[b], pts[c]) < -FLAT_AREA_EPS) return false;
    return ring.every(
      (o) =>
        o === a ||
        o === b ||
        o === c ||
        cross2(pts[a], pts[b], pts[o]) <= FLAT_AREA_EPS ||
        cross2(pts[b], pts[c], pts[o]) <= FLAT_AREA_EPS ||
        cross2(pts[c], pts[a], pts[o]) <= FLAT_AREA_EPS,
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
      // With four left, the ear's leftover is the last triangle — it must not be a sliver either.
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
      cross2(pts[t[0]], pts[t[1]], pts[p]) >= 0 && cross2(pts[t[1]], pts[t[2]], pts[p]) >= 0 && cross2(pts[t[2]], pts[t[0]], pts[p]) >= 0;
    const ti = tris.findIndex(inside);
    if (ti < 0) continue;
    const [a, b, c] = tris[ti];
    tris.splice(ti, 1, [a, b, p], [b, c, p], [c, a, p]);
  }

  flipToDelaunay(tris, pts);
  tris.forEach((t) => index.push(...t));
}

/** Flips interior edges until every pair of neighboring triangles satisfies the Delaunay condition. */
function flipToDelaunay(tris: [number, number, number][], pts: Point[]): void {
  const angleAt = (w: number, u: number, v: number) =>
    Math.abs(
      Math.atan2(
        cross2(pts[w], pts[u], pts[v]),
        (pts[u].x - pts[w].x) * (pts[v].x - pts[w].x) + (pts[u].y - pts[w].y) * (pts[v].y - pts[w].y),
      ),
    );

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
      if (angleAt(w1, u, v) + angleAt(w2, u, v) <= Math.PI + 1e-9) continue;
      if (cross2(pts[u], pts[w2], pts[w1]) <= FLAT_AREA_EPS || cross2(pts[w2], pts[v], pts[w1]) <= FLAT_AREA_EPS) continue;
      tris[owners[0]] = [u, w2, w1];
      tris[owners[1]] = [w2, v, w1];
      changed.add(owners[0]).add(owners[1]);
    }
    if (changed.size === 0) return;
  }
}

type Deformer = (q: Point3) => Point3;

/**
 * The fold and bend deformers of one vein edge (parent -> child; for the root, the stem straight
 * up from the base), null where the angle is zero. Both act smoothly over the whole blade past
 * the parent joint along the vein: the angle builds up linearly out to the farthest vertex
 * reached, so the blade curls as one arc instead of kinking. An on-axis vein reaches the whole
 * width; an off-axis vein reaches its own lobe (the width its subtree spans), fading out just
 * beyond it and never crossing the midrib.
 *
 * Bend curves the region out of the leaf plane (positive = toward +z). Fold hinges the two sides
 * of the vein toward each other around it — a lobe cups, the midrib closes the leaf like a book;
 * the vein itself stays put (positive lifts both sides toward +z).
 */
function veinDeformers(
  parentFlat: Point,
  childFlat: Point,
  node: VeinNode,
  ownedFlats: Point[],
  allFlats: Point[],
): { fold: Deformer | null; bend: Deformer | null } {
  const none = { fold: null, bend: null };
  const bend = ((node.bend ?? 0) * Math.PI) / 180;
  const fold = ((node.fold ?? 0) * Math.PI) / 180;
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
  for (const f of ownedFlats) halfWidth = Math.max(halfWidth, Math.abs(across(f)));
  const weight = (p: Point) => {
    if (onAxis) return 1;
    if (Math.abs(p.x) <= AXIS_EPS || Math.sign(p.x) !== side) return 0;
    return 1 - smoothstep((Math.abs(across(p)) - halfWidth) / (0.6 * halfWidth));
  };

  let reach = 0;
  for (const f of allFlats) if (along(f) > 0 && weight(f) > 0) reach = Math.max(reach, along(f));
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
    // Circular arc of curvature k; a point at height h rides the arc of radius r - h.
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

export function generateVeinMesh(
  veins: VeinData,
  options: { mirrorX?: boolean; params?: VeinGenParams; shapeOutline?: OutlineShaper } = {},
): VeinMesh {
  const mirrorX = options.mirrorX !== false;
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;
  const root = reparentCollinearChildren(veins.root);
  if (root.children.length === 0) return { position: [], index: [] };

  const index: number[] = [];
  const flats: Point[] = [];
  const owners: AugNode[] = [];
  const addVertex = (flat: Point, owner: AugNode) => {
    flats.push(flat);
    owners.push(owner);
    return flats.length - 1;
  };

  // Key point k of the half outline sits at half[k * stepCount] — that's how a tip finds its point.
  const { keyPoints, tipKeyIndex } = buildOutlineKeyPoints(root, params);
  const stepCount = Math.max(1, Math.round(params.subdivisions));
  const half = interpolateSpline(keyPoints, params.subdivisions);

  // The ring — same construction as `mirrorHalfOutline`, tracked per point.
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
  // Interior sampling distance — veins and the interior grid alike — twice the plain (untoothed)
  // outline's own point spacing, so `subdivisions` alone controls how dense the blade is; never
  // finer than 1% of the leaf.
  const perimeter = flatRing.reduce((sum, p, i) => sum + dist(p, flatRing[(i + 1) % flatRing.length]), 0);
  const leafSize = Math.max(...flatRing.map((p) => Math.abs(p.x))) * 2 || Math.max(...flatRing.map((p) => p.y));
  const step = Math.max((2 * perimeter) / flatRing.length, leafSize / 100);
  if (!(step > 0)) return { position: [], index: [] };
  const strutBetween = (from: Point, to: Point, owner: AugNode) => {
    const segments = Math.max(1, Math.round(dist(from, to) / step));
    const strut: number[] = [];
    for (let s = 1; s < segments; s++) strut.push(addVertex({ x: lerp(from.x, to.x, s / segments), y: lerp(from.y, to.y, s / segments) }, owner));
    return strut;
  };

  // 1. The mirror-augmented tree. Tips are pinned to the ring in step 2, once it is final.
  const rootAug: AugNode = { node: root, flat: { x: 0, y: 0 }, vertex: -1, strut: [], parent: null, depth: 0 };
  rootAug.vertex = addVertex(rootAug.flat, rootAug);
  const tips: { aug: AugNode; halfIdx: number; mirrored: boolean }[] = [];
  const postOrder: AugNode[] = [];

  const walk = (node: VeinNode, aug: AugNode, mirrored: boolean) => {
    const mirrorHere = mirrorX && !mirrored && Math.abs(node.x) <= AXIS_EPS;
    const visit = (child: VeinNode, childMirrored: boolean) => {
      const childAug: AugNode = { node: child, flat: { x: child.x, y: child.y }, vertex: -1, strut: [], parent: aug, depth: aug.depth + 1 };
      if (child.children.length === 0) {
        tips.push({ aug: childAug, halfIdx: tipKeyIndex.get(child.id)! * stepCount, mirrored: childMirrored });
      } else {
        childAug.strut = strutBetween(aug.flat, childAug.flat, childAug);
        childAug.vertex = addVertex(childAug.flat, childAug);
        walk(child, childAug, childMirrored);
      }
      postOrder.push(childAug);
    };
    for (const child of node.children) {
      visit(child, mirrored);
      if (mirrorHere && Math.abs(child.x) > AXIS_EPS) visit(mirrorNode(child), true);
    }
  };
  walk(root, rootAug, false);
  postOrder.push(rootAug);

  // 2. The tips as stations along the shaped ring: real ones forward, mirrored ones backward.
  type Station = { aug: AugNode; ringPos: number; mirrored: boolean };
  const stationOf = (tip: (typeof tips)[number], unshapedPos: number): Station => {
    const ringPos = shaped.originalIndex[unshapedPos];
    tip.aug.flat = outline[ringPos];
    tip.aug.strut = strutBetween(tip.aug.parent!.flat, tip.aug.flat, tip.aug);
    tip.aug.vertex = addVertex(outline[ringPos], tip.aug);
    return { aug: tip.aug, ringPos, mirrored: tip.mirrored };
  };
  const stations: Station[] = [
    { aug: rootAug, ringPos: shaped.originalIndex[0], mirrored: false },
    ...tips
      .filter((t) => !t.mirrored)
      .sort((a, b) => a.halfIdx - b.halfIdx)
      .map((t) => stationOf(t, t.halfIdx)),
    ...tips
      .filter((t) => t.mirrored && mirroredRingPos.has(t.halfIdx))
      .sort((a, b) => b.halfIdx - a.halfIdx)
      .map((t) => stationOf(t, mirroredRingPos.get(t.halfIdx)!)),
  ];

  // 3. One face per pair of neighboring stations.
  const commonAncestor = (a: AugNode, b: AugNode) => {
    while (a !== b) {
      if (a.depth >= b.depth) a = a.parent!;
      else b = b.parent!;
    }
    return a;
  };
  const pathUpTo = (from: AugNode, stop: AugNode) => {
    const out: number[] = [];
    for (let n = from; n !== stop; n = n.parent!) out.push(n.vertex, ...[...n.strut].reverse());
    return out;
  };

  stations.forEach((a, s) => {
    const b = stations[(s + 1) % stations.length];
    const pivot = commonAncestor(a.aug, b.aug);

    const arcFlat: Point[] = [];
    for (let r = (a.ringPos + 1) % outline.length; r !== b.ringPos; r = (r + 1) % outline.length) arcFlat.push(outline[r]);

    // Outline points belong to one of the two lobes, switching at the notch (the point closest
    // to the common joint). The notch itself goes with the lower tip on both halves; the base
    // has no lobe, so next to the root everything goes with the tip.
    let ownedByA: (i: number) => boolean = () => false;
    if (b.aug === rootAug) ownedByA = () => true;
    else if (a.aug !== rootAug) {
      let notch = -1;
      let best = Infinity;
      arcFlat.forEach((p, i) => {
        if (dist(p, pivot.flat) < best) {
          best = dist(p, pivot.flat);
          notch = i;
        }
      });
      ownedByA = a.mirrored || b.mirrored ? (i) => i < notch : (i) => i <= notch;
    }
    const arc = arcFlat.map((p, i) => addVertex(p, ownedByA(i) ? a.aug : b.aug));

    const poly = [pivot.vertex, ...pathUpTo(a.aug, pivot).reverse(), ...arc, ...pathUpTo(b.aug, pivot)];

    // Interior points on a grid with columns on the axis (so both halves get the same points and
    // none sits exactly half a step from the midrib), kept clear of the face's own boundary.
    const polyPts = poly.map((v) => flats[v]);
    const gridStart = (min: number, offset: number) => (Math.floor(min / step) + offset) * step;
    const clearOfBoundary = (p: Point) =>
      polyPts.every((a, i) => distToSegment(p, a, polyPts[(i + 1) % polyPts.length]) > step / 2);
    const interior: number[] = [];
    for (let y = gridStart(Math.min(...polyPts.map((p) => p.y)), 0.5); y < Math.max(...polyPts.map((p) => p.y)); y += step) {
      for (let x = gridStart(Math.min(...polyPts.map((p) => p.x)), 0); x < Math.max(...polyPts.map((p) => p.x)); x += step) {
        const p = { x, y };
        if (insidePolygon(p, polyPts) && clearOfBoundary(p)) interior.push(addVertex(p, pivot));
      }
    }
    triangulatePolygon(poly, interior, flats, index);
  });

  // 4. Bend and fold, children first so a parent carries its already-shaped subtree along.
  const isWithin = (owner: AugNode, aug: AugNode) => {
    for (let n: AugNode | null = owner; n && n.depth >= aug.depth; n = n.parent) if (n === aug) return true;
    return false;
  };
  // All folds first, then all bends
  const parts = postOrder.map((aug) =>
    veinDeformers(
      aug.parent?.flat ?? { x: 0, y: -1 },
      aug.flat,
      aug.node,
      flats.filter((_, v) => isWithin(owners[v], aug)),
      flats,
    ),
  );
  const deformers = [...parts.map((p) => p.fold), ...parts.map((p) => p.bend)].filter((d): d is Deformer => d !== null);

  const position: number[] = [];
  for (const flat of flats) {
    let p: Point3 = { x: flat.x, y: flat.y, z: 0 };
    for (const deform of deformers) p = deform(p);
    position.push(p.x, p.y, p.z);
  }
  return { position, index };
}
