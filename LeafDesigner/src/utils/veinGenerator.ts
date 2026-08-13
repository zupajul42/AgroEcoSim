import { VeinData, VeinNode, VeinGenParams } from "../types/leaf";

export type Point = { x: number; y: number };
export type Point3 = { x: number; y: number; z: number };
type KeyPoint = Point & { curvature: number; smoothing: number };

export const DEFAULT_VEIN_PARAMS: VeinGenParams = {
  lobeDepth: 0.15,
  lobeThreshold: 0,
  margin: 0.15,
  baseWidth: 0.25,
  curvature: 0.5,
  smoothing: 4,
};

// A key point sits exactly on the mirror axis (and shouldn't be duplicated) once it's
// this close to x = 0.
const AXIS_EPS = 0.001;

// Slider range for foldAngle: 0 = flat, ±180 = folded all the way back onto itself.
export const MAX_FOLD_ANGLE_DEG = 180;

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function genId(): string {
  return "vein-" + Math.random().toString(36).slice(2, 9);
}

// --- VEIN TREE CONSTRUCTION & MUTATION HELPERS ---

export function createVeinNode(x: number, y: number, children: VeinNode[] = [], id?: string): VeinNode {
  return { id: id || genId(), x: round(x), y: round(y), children };
}

export function findVeinNode(root: VeinNode, id: string): VeinNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findVeinNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Returns a NEW tree with the node matching `id` replaced by `updater(node)`. */
export function updateVeinTree(
  root: VeinNode,
  id: string,
  updater: (node: VeinNode) => VeinNode,
): VeinNode {
  if (root.id === id) return updater(root);
  return { ...root, children: root.children.map((c) => updateVeinTree(c, id, updater)) };
}

/** Returns a NEW tree with `newNode` appended as a child of the node matching `parentId`. */
export function addVeinChild(root: VeinNode, parentId: string, newNode: VeinNode): VeinNode {
  return updateVeinTree(root, parentId, (node) => ({ ...node, children: [...node.children, newNode] }));
}

/** Returns a NEW tree with the node matching `id` (and its whole subtree) removed. Root can't be removed. */
export function removeVeinNode(root: VeinNode, id: string): VeinNode {
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => removeVeinNode(c, id)),
  };
}

/** All node ids in `node`'s own subtree (including itself). */
export function getSubtreeIds(node: VeinNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: VeinNode) => {
    ids.add(n.id);
    n.children.forEach(walk);
  };
  walk(node);
  return ids;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * If the node `id` ends up within `threshold` of another node elsewhere in the tree —
 * excluding itself and its own descendants, so a merge can never create a cycle — it is
 * merged into that nearby node: the nearby node keeps its position, `id`'s own children
 * (if any) are re-parented onto it, and `id` is removed. This is what lets two vein tips
 * (or a stray branch dragged back onto its trunk) collapse into one instead of leaving a
 * near-duplicate point that pinches the generated outline.
 */
export function mergeNearbyVeinNode(
  root: VeinNode,
  id: string,
  threshold: number,
): { root: VeinNode; mergedInto: string | null } {
  const node = findVeinNode(root, id);
  if (!node || id === root.id) return { root, mergedInto: null };

  const excluded = getSubtreeIds(node);
  let closest: VeinNode | null = null;
  let closestDist = threshold;

  const walk = (n: VeinNode) => {
    if (!excluded.has(n.id)) {
      const d = dist(n, node);
      if (d <= closestDist) {
        closest = n;
        closestDist = d;
      }
    }
    n.children.forEach(walk);
  };
  walk(root);

  if (!closest) return { root, mergedInto: null };

  const targetId = closest.id;
  let nextRoot = removeVeinNode(root, id);
  node.children.forEach((child) => {
    nextRoot = addVeinChild(nextRoot, targetId, child);
  });

  return { root: nextRoot, mergedInto: targetId };
}

/** Flattened list of every (parent, node) edge in the tree — handy for rendering. */
export function flattenVeinEdges(root: VeinNode): { parent: VeinNode; node: VeinNode }[] {
  const edges: { parent: VeinNode; node: VeinNode }[] = [];
  const walk = (node: VeinNode, parent: VeinNode | null) => {
    if (parent) edges.push({ parent, node });
    node.children.forEach((c) => walk(c, node));
  };
  walk(root, null);
  return edges;
}

/** Resolves a tip node's effective margin/curvature/smoothing, falling back to the global params. */
export function getEffectiveTipParams(
  node: VeinNode,
  globalParams: VeinGenParams,
): { margin: number; curvature: number; smoothing: number } {
  return {
    margin: node.margin ?? globalParams.margin,
    curvature: node.curvature ?? globalParams.curvature,
    smoothing: node.smoothing ?? globalParams.smoothing,
  };
}

/** Resolves a branch joint's effective lobeDepth, falling back to the global param. */
export function getEffectiveLobeDepth(node: VeinNode, globalParams: VeinGenParams): number {
  return node.lobeDepth ?? globalParams.lobeDepth;
}

/** Resolves a branch joint's effective lobeThreshold, falling back to the global param. */
export function getEffectiveLobeThreshold(node: VeinNode, globalParams: VeinGenParams): number {
  return node.lobeThreshold ?? globalParams.lobeThreshold ?? 0;
}

/**
 * Fades lobeDepth out for siblings that sit close together, so a lobe only actually forms
 * once two neighboring veins are at least `threshold` apart — below that, the transition
 * stays smooth no matter how high lobeDepth is set. The fade itself ramps over one more
 * `threshold`-worth of distance (so it eases in rather than snapping on), and threshold <= 0
 * disables the whole feature (full lobeDepth always applies, the original behavior).
 */
function distanceGatedLobeDepth(lobeDepth: number, siblingGap: number, threshold: number): number {
  if (threshold <= 0) return lobeDepth;
  const rampSpan = Math.max(threshold, 0.01);
  const factor = Math.max(0, Math.min(1, (siblingGap - threshold) / rampSpan));
  return lobeDepth * factor;
}

/** True if any edge in the tree has a non-zero fold angle set. */
export function veinTreeHasFold(root: VeinNode): boolean {
  const walk = (node: VeinNode): boolean =>
    Math.abs(node.foldAngle ?? 0) > 0.05 || node.children.some(walk);
  return walk(root);
}

export function getDefaultVeinData(): VeinData {
  // A simple pinnate default: midrib chain with three secondary veins branching off it.
  const apex = createVeinNode(0, 2.0, [], "vein-apex");
  const mid3 = createVeinNode(0, 1.5, [createVeinNode(0.4, 1.8, [], "vein-3"), apex], "vein-mid-3");
  const mid2 = createVeinNode(0, 1.0, [createVeinNode(0.7, 1.3, [], "vein-2"), mid3], "vein-mid-2");
  const mid1 = createVeinNode(0, 0.4, [createVeinNode(0.5, 0.6, [], "vein-1"), mid2], "vein-mid-1");
  const root = createVeinNode(0, 0, [mid1], "vein-root");

  return { root, params: { ...DEFAULT_VEIN_PARAMS } };
}

/** Converts a node's legacy 0-1 `foldDegree` (pre-existing on any node object saved before
 *  folding used signed degrees) into `foldAngle`, recursively. A no-op once foldAngle exists. */
function migrateNodeFoldField(node: any): VeinNode {
  const { foldDegree, ...rest } = node;
  const foldAngle =
    rest.foldAngle !== undefined
      ? rest.foldAngle
      : typeof foldDegree === "number"
        ? round(foldDegree * MAX_FOLD_ANGLE_DEG)
        : undefined;

  return {
    ...rest,
    ...(foldAngle !== undefined ? { foldAngle } : {}),
    children: (node.children || []).map(migrateNodeFoldField),
  };
}

/**
 * Accepts either a current-format VeinData, a legacy { midribHeight, secondaries } shape
 * (from before venation was tree-structured), or null/undefined — and always returns a
 * valid tree-based VeinData. Safe to call on anything loaded from storage.
 */
export function migrateVeinData(v: any): VeinData {
  if (!v) return getDefaultVeinData();

  if (v.root) {
    return {
      root: migrateNodeFoldField(v.root),
      params: { ...DEFAULT_VEIN_PARAMS, ...(v.params || {}) },
    };
  }

  // Legacy shape: { midribHeight, secondaries: [{ id, startY, tip }] }
  if (Array.isArray(v.secondaries)) {
    const midribHeight = v.midribHeight || 2.0;
    const sorted = [...v.secondaries].sort((a, b) => a.startY - b.startY);

    let chainTail = createVeinNode(0, midribHeight, [], "vein-apex");
    for (let i = sorted.length - 1; i >= 0; i--) {
      const s = sorted[i];
      const tip = createVeinNode(Math.abs(s.tip?.x ?? 0.3), s.tip?.y ?? s.startY + 0.2, [], s.id);
      chainTail = createVeinNode(0, s.startY, [tip, chainTail], "vein-mid-" + i);
    }
    const root = createVeinNode(0, 0, [chainTail], "vein-root");

    return { root, params: { ...DEFAULT_VEIN_PARAMS, ...(v.params || {}) } };
  }

  return getDefaultVeinData();
}

/**
 * Non-uniform ("centripetal", alpha = 0.5) Catmull-Rom tangents at p1 and p2, for the
 * segment between them, given their neighbors p0 and p3.
 *
 * Plain uniform Catmull-Rom (tangent = tension * (next - prev)) assumes p0..p3 are evenly
 * spaced. Vein tips never are — a tip pushed out by a large margin sits much further from
 * its neighbors than they are from each other — and feeding that uneven spacing into the
 * uniform formula produces a tangent far longer than the segment it's meant to guide,
 * which makes the curve overshoot into a little loop instead of a smooth bulge, and makes
 * the curvature slider feel unpredictable (the loop eats the extra length before it ever
 * reads as "rounder"). Centripetal spacing scales each tangent by the actual local segment
 * lengths, so it stays well-behaved for any point spacing and the tension multiplier below
 * keeps doing what its slider name promises across its whole 0-1 range.
 */
function nonUniformTangents(p0: Point, p1: Point, p2: Point, p3: Point) {
  const d01 = Math.sqrt(Math.max(dist(p0, p1), 1e-4));
  const d12 = Math.sqrt(Math.max(dist(p1, p2), 1e-4));
  const d23 = Math.sqrt(Math.max(dist(p2, p3), 1e-4));

  const m1x = d12 * ((p1.x - p0.x) / d01 - (p2.x - p0.x) / (d01 + d12) + (p2.x - p1.x) / d12);
  const m1y = d12 * ((p1.y - p0.y) / d01 - (p2.y - p0.y) / (d01 + d12) + (p2.y - p1.y) / d12);
  const m2x = d12 * ((p2.x - p1.x) / d12 - (p3.x - p1.x) / (d12 + d23) + (p3.x - p2.x) / d23);
  const m2y = d12 * ((p2.y - p1.y) / d12 - (p3.y - p1.y) / (d12 + d23) + (p3.y - p2.y) / d23);

  return { m1x, m1y, m2x, m2y };
}

/** Backstop against pathological configurations even centripetal spacing can't tame. */
function clampTangent(tx: number, ty: number, refDist: number): [number, number] {
  const len = Math.sqrt(tx * tx + ty * ty);
  const maxLen = refDist * 2.5;
  if (len <= maxLen || len < 1e-6) return [tx, ty];
  const s = maxLen / len;
  return [tx * s, ty * s];
}

/**
 * Catmull-Rom (Hermite) spline interpolation between control points. Each key point carries
 * its own `curvature` (0 = straight segments, 0.5 = standard Catmull-Rom bulge, 1 = twice
 * that bulge — "how round this end of the curve is") and `smoothing` (samples for that
 * segment) — a segment between two key points uses the average of their two values, so
 * per-tip overrides blend smoothly into their neighbors instead of snapping at the boundary.
 */
function interpolateSpline(points: KeyPoint[]): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: p.x, y: p.y }));

  if (points.length === 2) {
    const [a, b] = points;
    const samples = Math.max(2, Math.min(8, Math.round((a.smoothing + b.smoothing) / 2)));
    const result: Point[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      result.push({ x: round(lerp(a.x, b.x, t)), y: round(lerp(a.y, b.y, t)) });
    }
    return result;
  }

  const result: Point[] = [];
  const p = [points[0], ...points, points[points.length - 1]];

  for (let i = 0; i < p.length - 3; i++) {
    const p0 = p[i];
    const p1 = p[i + 1];
    const p2 = p[i + 2];
    const p3 = p[i + 3];

    // tension 0.5 (the default) reproduces the standard Catmull-Rom tangent magnitude;
    // 0 flattens toward straight segments, 1 doubles the bulge.
    const tensionScale = 2 * Math.max(0, Math.min(1, (p1.curvature + p2.curvature) / 2));
    const samples = Math.max(2, Math.min(8, Math.round((p1.smoothing + p2.smoothing) / 2)));

    const { m1x, m1y, m2x, m2y } = nonUniformTangents(p0, p1, p2, p3);
    const refDist = Math.max(dist(p1, p2), 1e-4);
    const [tm1x, tm1y] = clampTangent(m1x * tensionScale, m1y * tensionScale, refDist);
    const [tm2x, tm2y] = clampTangent(m2x * tensionScale, m2y * tensionScale, refDist);

    for (let tStep = 0; tStep < samples; tStep++) {
      const t = tStep / samples;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      result.push({
        x: round(h00 * p1.x + h10 * tm1x + h01 * p2.x + h11 * tm2x),
        y: round(h00 * p1.y + h10 * tm1y + h01 * p2.y + h11 * tm2y),
      });
    }
  }

  result.push({
    x: round(points[points.length - 1].x),
    y: round(points[points.length - 1].y),
  });

  return result;
}

/** Extends `to` outward from `from`, along the from->to direction, by `margin`. */
function extendFrom(from: Point, to: Point, margin: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { x: round(to.x), y: round(to.y) };
  return { x: round(to.x + (dx / len) * margin), y: round(to.y + (dy / len) * margin) };
}

/**
 * Generates the blade outline by tracing a smooth curve through the tips of the
 * vein tree — the literal "lay a curve through each vein end to span the leaf area".
 *
 * Traversal: at every branch joint, children are visited in ascending y order, so
 * the outline runs from the base, out along each side vein (nearest first), up
 * through the tree, and finally to the apex (the tip that ends the tallest chain).
 * Whenever a joint has more than one child, a "sinus" key point is inserted at that
 * joint (blended by `lobeDepth`) — the natural dip in the margin between two veins
 * that share a branch point.
 *
 * A key point that lands exactly on the mirror axis (x = 0) — a vein tip dragged onto
 * the centerline, or the natural apex — is kept exactly once in the final ring instead
 * of being mirrored into a duplicate.
 *
 * This is always the FLAT (unfolded) rest shape — fold degrees only affect the 3D mesh
 * (see generateFoldedMeshOutline), never the 2D outline you edit here.
 */
export function generateOutlineFromVeins(
  veins: VeinData,
  options: { mirrorX: boolean; params?: VeinGenParams },
): Point[] {
  const { mirrorX = true } = options;
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;
  const { margin = 0.15, baseWidth = 0.25, curvature = 0.5, smoothing = 4 } = params;

  const auxPoint = (p: Point): KeyPoint => ({ ...p, curvature, smoothing });

  const finish = (keyPoints: KeyPoint[]): Point[] => {
    const rightSpline = interpolateSpline(keyPoints);
    if (!mirrorX) return rightSpline;

    // Walk the half-profile forward once (base -> ... -> apex-ish), then walk it
    // backward mirroring x, skipping any point already on the axis so it isn't drawn twice.
    const ring: Point[] = [...rightSpline];
    for (let i = rightSpline.length - 1; i >= 0; i--) {
      const p = rightSpline[i];
      if (Math.abs(p.x) > AXIS_EPS) ring.push({ x: round(-p.x), y: p.y });
    }
    return ring;
  };

  const root = veins.root;
  if (!root || root.children.length === 0) {
    // No veins placed yet — fall back to a simple oval so there's always something to see.
    const h = 2.0;
    const ovalWidth = 0.5 + margin;
    return finish(
      [
        { x: 0, y: 0 },
        { x: round(ovalWidth * baseWidth * 2), y: round(h * 0.25) },
        { x: round(ovalWidth), y: round(h * 0.5) },
        { x: round(ovalWidth * 0.6), y: round(h * 0.8) },
        { x: 0, y: round(h) },
      ].map(auxPoint),
    );
  }

  // Reference scale for the base-width transition point.
  let maxTipX = 0.3;
  const collectMax = (node: VeinNode) => {
    if (node.children.length === 0) maxTipX = Math.max(maxTipX, Math.abs(node.x));
    node.children.forEach(collectMax);
  };
  collectMax(root);

  const keyPoints: KeyPoint[] = [auxPoint({ x: 0, y: 0 })];

  // Only meaningful when the base leads into a single chain (pinnate-style start).
  // If the base itself forks into multiple veins (palmate-style), the branch-joint
  // sinus logic below already produces a natural transition at the origin.
  if (root.children.length === 1) {
    const baseW = baseWidth * maxTipX;
    if (baseW > 0.01) {
      keyPoints.push(auxPoint({ x: round(baseW), y: round(root.children[0].y * 0.35) }));
    }
  }

  const buildKeyPoints = (node: VeinNode, parentPos: Point) => {
    const sortedChildren = [...node.children].sort((a, b) => a.y - b.y);
    const lobeDepth = getEffectiveLobeDepth(node, params);
    const lobeThreshold = getEffectiveLobeThreshold(node, params);

    sortedChildren.forEach((child, idx) => {
      if (idx > 0 && keyPoints.length > 0) {
        const prevPt = keyPoints[keyPoints.length - 1];
        // Fade the lobe out entirely when this vein and its previous sibling are close
        // together — a deep notch between two nearly-adjacent veins reads as a pinch, not
        // a lobe, so it shouldn't form until they're at least lobeThreshold apart.
        const siblingGap = dist(sortedChildren[idx - 1], child);
        const gatedLobeDepth = distanceGatedLobeDepth(lobeDepth, siblingGap, lobeThreshold);

        // lobeDepth 0 means "go straight to the next vein" — no extra point at all, so
        // the curve is whatever the two real tips naturally interpolate to on their own.
        // Inserting ANY extra point here (even a "neutral" midpoint) gives Catmull-Rom one
        // more thing to bend through, which still reads as a dip once curvature is high.
        if (gatedLobeDepth > 0.001) {
          const smoothX = (prevPt.x + child.x) / 2;
          const smoothY = (prevPt.y + child.y) / 2;
          keyPoints.push(
            auxPoint({
              x: round(Math.max(lerp(smoothX, node.x, gatedLobeDepth), 0)),
              y: round(lerp(smoothY, node.y, gatedLobeDepth)),
            }),
          );
        }
      }

      if (child.children.length === 0) {
        const tipParams = getEffectiveTipParams(child, params);
        keyPoints.push({
          ...extendFrom(node, child, tipParams.margin),
          curvature: tipParams.curvature,
          smoothing: tipParams.smoothing,
        });
      } else {
        buildKeyPoints(child, node);
      }
    });
  };

  buildKeyPoints(root, { x: 0, y: 0 });

  return finish(keyPoints);
}

// --- 3D FOLDED MESH OUTLINE (used only by the mesh generator, never the 2D editor) ---

/** Rotates `p` around the line through `axisPoint` in direction `axisDir`, by `angleRad`. */
function rotateAroundAxis3D(p: Point3, axisPoint: Point3, axisDir: Point3, angleRad: number): Point3 {
  const len = Math.sqrt(axisDir.x * axisDir.x + axisDir.y * axisDir.y + axisDir.z * axisDir.z);
  if (len < 1e-6 || Math.abs(angleRad) < 1e-6) return { x: p.x, y: p.y, z: p.z };

  const ax = axisDir.x / len;
  const ay = axisDir.y / len;
  const az = axisDir.z / len;

  const px = p.x - axisPoint.x;
  const py = p.y - axisPoint.y;
  const pz = p.z - axisPoint.z;

  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dot = px * ax + py * ay + pz * az;

  // Rodrigues' rotation formula.
  const crossX = ay * pz - az * py;
  const crossY = az * px - ax * pz;
  const crossZ = ax * py - ay * px;

  return {
    x: px * cos + crossX * sin + ax * dot * (1 - cos) + axisPoint.x,
    y: py * cos + crossY * sin + ay * dot * (1 - cos) + axisPoint.y,
    z: pz * cos + crossZ * sin + az * dot * (1 - cos) + axisPoint.z,
  };
}

type FoldTransform = (p: Point3) => Point3;
const IDENTITY_TRANSFORM: FoldTransform = (p) => p;

type FoldKeyPoint = { flat: Point; folded: Point3; curvature: number; smoothing: number };

function dist3(a: Point3, b: Point3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/** 3D counterpart of nonUniformTangents. */
function nonUniformTangents3(p0: Point3, p1: Point3, p2: Point3, p3: Point3) {
  const d01 = Math.sqrt(Math.max(dist3(p0, p1), 1e-4));
  const d12 = Math.sqrt(Math.max(dist3(p1, p2), 1e-4));
  const d23 = Math.sqrt(Math.max(dist3(p2, p3), 1e-4));

  const axis = (a: number, b: number, c: number, d: number) =>
    d12 * ((b - a) / d01 - (c - a) / (d01 + d12) + (c - b) / d12);
  const axis2 = (a: number, b: number, c: number, d: number) =>
    d12 * ((c - b) / d12 - (d - b) / (d12 + d23) + (d - c) / d23);

  return {
    m1: { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y), z: axis(p0.z, p1.z, p2.z, p3.z) },
    m2: { x: axis2(p0.x, p1.x, p2.x, p3.x), y: axis2(p0.y, p1.y, p2.y, p3.y), z: axis2(p0.z, p1.z, p2.z, p3.z) },
  };
}

function clampTangent3(v: Point3, refDist: number): Point3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const maxLen = refDist * 2.5;
  if (len <= maxLen || len < 1e-6) return v;
  const s = maxLen / len;
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

/** Same centripetal tangents & tension scaling as interpolateSpline, in 3D. */
function interpolateSpline3D(points: FoldKeyPoint[]): Point3[] {
  if (points.length < 2) return points.map((p) => p.folded);

  if (points.length === 2) {
    const [a, b] = points;
    const samples = Math.max(2, Math.min(8, Math.round((a.smoothing + b.smoothing) / 2)));
    const result: Point3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      result.push({
        x: round(lerp(a.folded.x, b.folded.x, t)),
        y: round(lerp(a.folded.y, b.folded.y, t)),
        z: round(lerp(a.folded.z, b.folded.z, t)),
      });
    }
    return result;
  }

  const result: Point3[] = [];
  const p = [points[0], ...points, points[points.length - 1]];

  for (let i = 0; i < p.length - 3; i++) {
    const p0 = p[i].folded;
    const p1 = p[i + 1].folded;
    const p2 = p[i + 2].folded;
    const p3 = p[i + 3].folded;

    const tensionScale = 2 * Math.max(0, Math.min(1, (p[i + 1].curvature + p[i + 2].curvature) / 2));
    const samples = Math.max(2, Math.min(8, Math.round((p[i + 1].smoothing + p[i + 2].smoothing) / 2)));

    const { m1: rawM1, m2: rawM2 } = nonUniformTangents3(p0, p1, p2, p3);
    const refDist = Math.max(dist3(p1, p2), 1e-4);
    const m1 = clampTangent3(
      { x: rawM1.x * tensionScale, y: rawM1.y * tensionScale, z: rawM1.z * tensionScale },
      refDist,
    );
    const m2 = clampTangent3(
      { x: rawM2.x * tensionScale, y: rawM2.y * tensionScale, z: rawM2.z * tensionScale },
      refDist,
    );

    for (let tStep = 0; tStep < samples; tStep++) {
      const t = tStep / samples;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      result.push({
        x: round(h00 * p1.x + h10 * m1.x + h01 * p2.x + h11 * m2.x),
        y: round(h00 * p1.y + h10 * m1.y + h01 * p2.y + h11 * m2.y),
        z: round(h00 * p1.z + h10 * m1.z + h01 * p2.z + h11 * m2.z),
      });
    }
  }

  const last = points[points.length - 1].folded;
  result.push({ x: round(last.x), y: round(last.y), z: round(last.z) });

  return result;
}

/**
 * Builds the same key points as generateOutlineFromVeins, but each one carries its actual
 * 3D position after every ancestor edge's fold degree has been applied as a hinge rotation.
 * Folding a vein's edge rotates everything beyond it — its own further descendants and their
 * boundary points — around the line from that edge's parent to itself, exactly like an
 * articulated bone chain (each fold composes on top of its ancestors' folds). A "sinus" point
 * between two sibling veins stays in its parent's (unfolded-by-either-child) frame, since it's
 * the shared hinge boundary between them, not part of either flap.
 */
function buildFoldedKeyPoints(veins: VeinData, params: VeinGenParams): FoldKeyPoint[] {
  const { margin = 0.15, baseWidth = 0.25 } = params;
  const root = veins.root;
  const keyPoints: FoldKeyPoint[] = [];

  keyPoints.push({ flat: { x: 0, y: 0 }, folded: { x: 0, y: 0, z: 0 }, curvature: params.curvature, smoothing: params.smoothing });

  if (!root || root.children.length === 0) return keyPoints;

  let maxTipX = 0.3;
  const collectMax = (node: VeinNode) => {
    if (node.children.length === 0) maxTipX = Math.max(maxTipX, Math.abs(node.x));
    node.children.forEach(collectMax);
  };
  collectMax(root);

  if (root.children.length === 1) {
    const baseW = baseWidth * maxTipX;
    if (baseW > 0.01) {
      const flat = { x: round(baseW), y: round(root.children[0].y * 0.35) };
      keyPoints.push({ flat, folded: { x: flat.x, y: flat.y, z: 0 }, curvature: params.curvature, smoothing: params.smoothing });
    }
  }

  const walk = (node: VeinNode, transform: FoldTransform) => {
    const sortedChildren = [...node.children].sort((a, b) => a.y - b.y);
    const lobeDepth = getEffectiveLobeDepth(node, params);
    const lobeThreshold = getEffectiveLobeThreshold(node, params);
    const nodeFlat: Point = { x: node.x, y: node.y };

    sortedChildren.forEach((child, idx) => {
      if (idx > 0 && keyPoints.length > 0) {
        const prevFlat = keyPoints[keyPoints.length - 1].flat;
        const siblingGap = dist(sortedChildren[idx - 1], child);
        const gatedLobeDepth = distanceGatedLobeDepth(lobeDepth, siblingGap, lobeThreshold);

        // Same fix as the 2D generator: lobeDepth 0 means no extra point at all — straight
        // to the next vein — not even a "neutral" midpoint, which still bends the curve
        // once tension is high.
        if (gatedLobeDepth > 0.001) {
          const smoothX = (prevFlat.x + child.x) / 2;
          const smoothY = (prevFlat.y + child.y) / 2;
          const sinusFlat = {
            x: Math.max(lerp(smoothX, node.x, gatedLobeDepth), 0),
            y: lerp(smoothY, node.y, gatedLobeDepth),
          };
          const sinusFolded = transform({ x: sinusFlat.x, y: sinusFlat.y, z: 0 });
          keyPoints.push({ flat: sinusFlat, folded: sinusFolded, curvature: params.curvature, smoothing: params.smoothing });
        }
      }

      // Canonicalize which way "positive" folds: computed from this edge's FLAT (rest-pose)
      // direction, never its already-folded one, so a given foldAngle always means the same
      // thing for this branch regardless of how deep it sits or how its ancestors folded.
      // The perpendicular (90° CCW) of the flat direction should point outward (+X, away
      // from the centerline) for a positive angle to read as "folded forward"; if a branch's
      // own flat direction would make that perpendicular point inward instead, flip the sign
      // so the slider still means the same physical thing.
      const flatPerpX = -(child.y - nodeFlat.y);
      const angleSign = flatPerpX < 0 ? -1 : 1;
      const angle = (angleSign * (child.foldAngle ?? 0) * Math.PI) / 180;
      const axisPoint = transform({ x: nodeFlat.x, y: nodeFlat.y, z: 0 });
      const axisTarget = transform({ x: child.x, y: child.y, z: 0 });
      const axisDir: Point3 = {
        x: axisTarget.x - axisPoint.x,
        y: axisTarget.y - axisPoint.y,
        z: axisTarget.z - axisPoint.z,
      };
      const childTransform: FoldTransform = (p) => rotateAroundAxis3D(transform(p), axisPoint, axisDir, angle);

      if (child.children.length === 0) {
        const tipParams = getEffectiveTipParams(child, params);
        const extendedFlat = extendFrom(nodeFlat, { x: child.x, y: child.y }, tipParams.margin);
        const folded = childTransform({ x: extendedFlat.x, y: extendedFlat.y, z: 0 });
        keyPoints.push({ flat: extendedFlat, folded, curvature: tipParams.curvature, smoothing: tipParams.smoothing });
      } else {
        walk(child, childTransform);
      }
    });
  };

  walk(root, IDENTITY_TRANSFORM);

  return keyPoints;
}

/**
 * The 3D counterpart of generateOutlineFromVeins, for the mesh generator only: same curve
 * through the same vein tips, but bent in 3D wherever an edge has a fold degree set. Mirroring
 * happens on the already-folded 3D points (negating x only) — folding the same tree with all
 * x's negated produces exactly the mirror of folding it as-is, so the left half never needs a
 * separate pass. Falls back to flat (z = 0) geometry wherever no fold is set, so this is a
 * strict superset of the 2D outline whenever nothing is folded.
 */
export function generateFoldedMeshOutline(
  veins: VeinData,
  options: { mirrorX?: boolean; params?: VeinGenParams } = {},
): Point3[] {
  const mirrorX = options.mirrorX !== false;
  const params = options.params || veins.params || DEFAULT_VEIN_PARAMS;

  const keyPoints = buildFoldedKeyPoints(veins, params);
  if (keyPoints.length < 2) return keyPoints.map((k) => k.folded);

  if (!mirrorX) return interpolateSpline3D(keyPoints);

  // Mirror at the KEY POINT level (not after interpolation) so the "is this on the axis"
  // check can use the point's flat x — its rest-shape topology — rather than its folded
  // x, which can drift away from 0 once an ancestor fold tilts it out of the center plane.
  const full: FoldKeyPoint[] = [...keyPoints];
  for (let i = keyPoints.length - 1; i >= 0; i--) {
    const kp = keyPoints[i];
    if (Math.abs(kp.flat.x) > AXIS_EPS) {
      full.push({
        flat: { x: -kp.flat.x, y: kp.flat.y },
        folded: { x: -kp.folded.x, y: kp.folded.y, z: kp.folded.z },
        curvature: kp.curvature,
        smoothing: kp.smoothing,
      });
    }
  }

  return interpolateSpline3D(full);
}
