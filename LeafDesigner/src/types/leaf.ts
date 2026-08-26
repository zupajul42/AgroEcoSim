export interface VeinNode {
  id: string;
  x: number;
  y: number;
  children: VeinNode[];
  foldAngle?: number;

  // Per-joint overrides
  margin?: number;
  curvature?: number;
  smoothing?: number;
  lobeDepth?: number;
  lobeThreshold?: number;
}

export interface VeinGenParams {
  lobeDepth: number;  // 0-1: how deep the outline dips toward a branch joint between two child veins (0 = smooth, 1 = follows the joint exactly)
  lobeThreshold: number; // 0+: minimum distance between two sibling veins before a lobe starts forming between them at all — below it, the transition stays smooth regardless of lobeDepth
  margin: number;     // 0-0.5: extra distance the outline extends beyond each vein tip
  baseWidth: number;  // 0-1: relative width of the transition point near the stem base
  curvature: number;  // 0-1: spline tension — 0 = straight segments between key points, 1 = fully curved
  smoothing: number;  // 2-8: spline interpolation resolution
}

export interface VeinData {
  root: VeinNode;
  params?: VeinGenParams;
}

export interface LeafGeometry {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  veins?: VeinData | null;
  margin?: LeafMargin;
}

export interface Leaf {
  name: string;
  shape: LeafShape[];
  layout?: LeafLayout;
  instances: LeafInstance[];
  petiole: Petiole;
}

export type LeafMargin = "entire" | "serrate" | "dentate" | "lobed" | "incised";
export type LeafVenation = "arcuate" | "palmate" | "pinnate" | "parallel";
export type LeafFolding = "none" | "rolled" | "convolute";

export interface LeafShape {
  geom: string[];
  scaleX?: number[];
  scaleY?: number[];
  margin: LeafMargin;
  venation: LeafVenation;
  folding: LeafFolding;
  petiolule: Petiole;
}

export type LeafLayoutType = "palmate" | "pinnate" | "bipinnate";
export type LeafArrangement = "alternate" | "opposite" | "whorled";

export interface LeafLayout {
  type: LeafLayoutType;
  angle: number;
  arrangement: LeafArrangement;
  terminalLeaf: boolean;
  distributionCurve?: number;
}

export interface LeafInstance {
  shape: number;
  scale?: number;
}

export interface Petiole {
  x: number;
  y: number;
  len: number;
  width: number;
  angle: number;
}
