//

export interface Point {
  x: number;
  y: number;
}

/** Indexed triangle mesh: flat xyz positions and vertex indices, three per triangle. */
export interface MeshData {
  position: number[];
  index: number[];
}

export interface VeinNode {
  id: string;
  x: number;
  y: number;
  children: VeinNode[];
  bend?: number; // degrees the vein curls out of the leaf plane
  fold?: number; // degrees the two sides of the vein hinge toward each other

  // Per-node overrides of VeinGenParams
  margin?: number;
  curvature?: number;
  lobeDepth?: number;
  lobeThreshold?: number;
}

export interface VeinGenParams {
  lobeDepth: number; // 0-1: how deep the outline dips toward the joint between two sibling veins
  lobeThreshold: number; // minimum gap between two sibling veins before a lobe forms between them
  margin: number; // 0-0.5: how far the outline extends beyond each vein tip
  curvature: number; // 0-1: roundness of each tip, 0 = pointed
  subdivisions: number; // outline points per spline segment
}

export interface VeinData {
  root: VeinNode;
  params?: VeinGenParams;
}

export interface LeafGeometry {
  id: string;
  name: string;
  points: Point[];
  veins?: VeinData | null;
  margin?: LeafMargin;
  marginToothSize?: number;
  marginToothDepth?: number;
}

export interface Leaf {
  name: string;
  shape: LeafShape[];
  layout?: LeafLayout;
  instances: LeafInstance[];
  petiole: Petiole;
  randomSeed?: number;
  colorRamp?: ColorStop[];
}

export interface ColorStop {
  t: number;
  color: string;
}

export interface RandomRange {
  min: number;
  max: number;
}

export type LeafMargin = "entire" | "serrate" | "dentate" | "lobed" | "incised";

export interface LeafShape {
  geom: string[]; // one geometry id per level of detail
  scaleX?: (number | RandomRange)[];
  scaleY?: (number | RandomRange)[];
  petiolule: Petiole;
}

export type LeafLayoutType = "palmate" | "pinnate" | "bipinnate";
export type LeafArrangement = "alternate" | "opposite" | "whorled";

export interface LeafLayout {
  angle: number | RandomRange; // branch (pinnate) or fanning (palmate) angle
  type: LeafLayoutType;
  arrangement: LeafArrangement;
  terminalLeaf: boolean;
  distributionCurve?: number;
}

export interface LeafInstance {
  shape: number;
  scale?: number | RandomRange;
  scaleOffset?: number;
}

export interface Petiole {
  x: number;
  y: number;
  len: number;
  width: number;
  angle: number;
}
