import { LeafGeometry } from "../types/leaf";

export const quad: LeafGeometry = {
  id: "def:quad",
  name: "quad",
  points: [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 2 },
    { x: -1, y: 2 },
  ],
  veins: null,
};

export const ovate: LeafGeometry = {
  id: "def:ovate",
  name: "ovate",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};

export const elliptic: LeafGeometry = {
  id: "def:elliptic",
  name: "elliptic",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};

export const obovate = {
  id: "def:obovate",
  name: "obovate",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};

export const lanceolate = {
  id: "def:lanceolate",
  name: "lanceolate",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};

export const oblong = {
  id: "def:oblong",
  name: "oblong",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};

export const orbicular = {
  id: "def:orbicular",
  name: "orbicular",
  points: [
    { x: 0, y: 1.1 },
    { x: 0.2, y: 0.8 },
    { x: 0.3, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.1, y: 0 },
    { x: -0.1, y: 0 },
    { x: -0.2, y: 0.1 },
    { x: -0.3, y: 0.5 },
    { x: -0.2, y: 0.8 },
  ],
  veins: null,
};


export const all = [
  quad,
  ovate,
  obovate,
  elliptic,
  lanceolate,
  oblong,
  orbicular,
];
