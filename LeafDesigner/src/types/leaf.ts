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
  tipOffset?: number;
  lateralOffset?: number;
  curvature?: number;
  lobeDepth?: number;
  lobeThreshold?: number;
  marginInfluence?: number;
}

export interface VeinGenParams {
  lobeDepth: number; // 0-1: how deep the outline dips toward the joint between two sibling veins
  lobeThreshold: number; // minimum gap between two sibling veins before a lobe forms between them
  tipOffset: number; // 0-0.5: how far the outline extends beyond each vein tip
  lateralOffset: number; // how far the outline bulges sideways at a joint without its own value
  curvature: number; // 0-1: roundness of each tip, 0 = pointed
  subdivisions: number; // outline points per spline segment
  marginInfluence?: number; // 0-1: how strongly the margin's teeth show at a vein point without its own value
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
  marginToothCount?: number;
  marginToothHeight?: number | RandomRange;
  marginToothLean?: number;
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

export type LeafMargin = "entire" | "serrate" | "sinuate" | "dentate" | "crenate";

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
  orbit?: number | RandomRange; // pinnate: degrees each leaflet turns around the stem, mirrored on the two sides
  type: LeafLayoutType;
  arrangement: LeafArrangement;
  terminalLeaf: boolean;
  zoneStart?: number; // pinnate: lowest node as a fraction of the stem length
  zoneEnd?: number; // pinnate: highest node (below the terminal leaflet) as a fraction of the stem length
  spacingTaper?: number; // pinnate: 1 = even, < 1 nodes crowd toward zoneEnd, > 1 toward zoneStart
  whorlSize?: number; // leaflets per node for the whorled arrangement
  pinnaCount?: number; // bipinnate: pinnae along the petiole, each carrying all instances
  rachis?: Petiole; // bipinnate: the stem of one pinna
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
