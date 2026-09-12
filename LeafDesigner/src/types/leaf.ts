export interface VeinNode {
  id: string;
  x: number;
  y: number;
  children: VeinNode[];
  foldAngle?: number; // fold -> bending
  twistAngle?: number; // twist -> folding

  // Per-joint overrides
  margin?: number;
  curvature?: number;
  lobeDepth?: number;
  lobeThreshold?: number;
}

export interface VeinGenParams {
  lobeDepth: number;  // 0-1: how deep the outline dips toward a branch joint between two child veins (0 = smooth, 1 = follows the joint exactly)
  lobeThreshold: number; // 0+: minimum distance between two sibling veins before a lobe starts forming between them at all — below it, the transition stays smooth regardless of lobeDepth
  margin: number;     // 0-0.5: extra distance the outline extends beyond each vein tip
  curvature: number;  // 0-1: "Roundness" — how rounded each vein tip's curve is (0 = pointed, 1 = fully rounded bulge). The dip between two veins (the sinus) is always kept comparatively sharp regardless of this — see resolveSinusCurvature() in veinGenerator.ts.
  subdivisions: number;
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
export type LeafVenation = "arcuate" | "palmate" | "pinnate" | "parallel";
export type LeafFolding = "none" | "rolled" | "convolute";

export interface LeafShape {
  geom: string[];
  scaleX?: (number | RandomRange)[];
  scaleY?: (number | RandomRange)[];
  margin: LeafMargin;
  venation: LeafVenation;
  folding: LeafFolding;
  petiolule: Petiole;
}

export type LeafLayoutType = "palmate" | "pinnate" | "bipinnate";
export type LeafArrangement = "alternate" | "opposite" | "whorled";

export interface LeafLayout {
  angle: number | RandomRange; // Branch/fanning angle
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
