export interface LeafGeometry {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  veins: any;
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
  geom: string;
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
