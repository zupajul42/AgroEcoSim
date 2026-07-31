import { Leaf, LeafGeometry } from "../types/leaf";

const demoLeaf: Leaf = {
  name: "Chestnut",
  shape: [
    {
      geom: "def:obovate",
      margin: "serrate",
      venation: "palmate",
      folding: "none",
      petiolule: { len: 0, angle: 0, width: 0.5, x: 0, y: 0 },
    },
  ],
  layout: {
    type: "palmate",
    arrangement: "opposite",
    terminalLeaf: true,
    angle: 140,
  },
  instances: [
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
  ],
  petiole: { len: 3, angle: 0, width: 0.5, x: 0, y: 0 },
};

const predefinedGeometries: LeafGeometry[] = [
  {
    id: "def:quad",
    name: "quad",
    points: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: -1, y: 2 },
    ],
    veins: null,
  },
  {
    id: "def:obovate",
    name: "obovate",
    points: [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 2 },
      { x: -1, y: 2 },
    ],
    veins: null,
  },
];

class AppState {
  leafs: LeafStorage;
  geoms: GeometryStorage;

  constructor() {
    this.geoms = new GeometryStorage();
    this.leafs = new LeafStorage();
  }
}

class LeafStorage {
  private leafLib: Leaf[] = [];

  private _save() {
    window.localStorage.setItem("leafLib", JSON.stringify(this.leafLib));
  }
  private _load() {
    let lib = window.localStorage.getItem("leafLib");
    this.leafLib = lib ? JSON.parse(lib) : [];
    return this.leafLib;
  }

  public createDefault(): Leaf {
    return {
      name: "Unnamed leaf",
      instances: [{ shape: 0, scale: 1 }],
      petiole: { len: 3, width: 0.1, x: 0, y: 0, angle: 0 },
      shape: [
        {
          geom: "def:obovate",
          folding: "none",
          margin: "serrate",
          petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 },
          venation: "pinnate",
        },
      ],
    };
  }

  public has(name: string): boolean {
    return this._load().findIndex((l) => l.name == name) != -1;
  }

  public all(): Leaf[] {
    if (!this.has(demoLeaf.name)) {
      this.leafLib.push(demoLeaf);
      this._save();
    }
    return this.leafLib;
  }

  public add(leaf: Leaf): number {
    this._load().push(leaf);
    this._save();
    return this.leafLib.length - 1;
  }

  public remove(leaf: Leaf): boolean {
    this._load();
    let i = this.leafLib.findIndex((l) => l.name == leaf.name);
    if (i != -1) {
      this.leafLib.splice(i, 1);
      this._save();
      return true;
    }
    return false;
  }

  public select(leafNdx?: number) {
    if (leafNdx < 0) this.unselect();
    else window.localStorage.setItem("selectedLeaf", leafNdx.toString());
  }

  public unselect() {
    window.localStorage.removeItem("selectedLeaf");
  }

  public selected(): Leaf | undefined {
    let leafNdx = +(window.localStorage.getItem("selectedLeaf") ?? -1);
    if (leafNdx == -1) return undefined;
    return this._load()[leafNdx];
  }

  public updateSelected(leaf: Leaf) {
    let leafNdx = +(window.localStorage.getItem("selectedLeaf") ?? -1);
    if (leafNdx == -1) return undefined;

    this._load()[leafNdx] = leaf;
    this._save();
  }
}

class GeometryStorage {
  private leafGeoms: LeafGeometry[] = [];

  private _save() {
    window.localStorage.setItem("geomLib", JSON.stringify(this.leafGeoms));
  }

  private _load() {
    let lib = window.localStorage.getItem("geomLib");
    this.leafGeoms = lib ? JSON.parse(lib) : [];
    return this.leafGeoms;
  }

  public all(): LeafGeometry[] {
    this._load();
    for (const p of predefinedGeometries) {
      if (!this.leafGeoms.some((g) => g.id == p.id)) {
        this.leafGeoms.push(p);
        this._save();
      }
    }
    return this.leafGeoms;
  }

  public update(ndx: number, geom: LeafGeometry): boolean {
    this._load();
    if (ndx > this.leafGeoms.length || ndx < 0) return false;
    this.leafGeoms[ndx] = geom;
    this._save();
    return true;
  }

  public updateById(id: string, geom: LeafGeometry): boolean {
    this._load();
    const i = this.leafGeoms.findIndex((g) => g.id == id);
    return this.update(i, geom);
  }

  public updateByName(name: string, geom: LeafGeometry): boolean {
    this._load();
    const i = this.leafGeoms.findIndex((g) => g.name == name);
    return this.update(i, geom);
  }

  public add(geom: LeafGeometry) {
    if (!geom) return;

    this._load().push(geom);
    this._save();
  }

  public get(id: string) {
    return this.all().find((g) => g.id == id);
  }

  public getNormalized(id: string) {
    const g = this.get(id);
    if (!g) return null;

    const bounds = { x: { min: 100, max: -100 }, y: { min: 100, max: -100 } };
    for (const p of g.points) {
      if (p.x < bounds.x.min) bounds.x.min = p.x;
      if (p.x > bounds.x.max) bounds.x.max = p.x;
      if (p.y < bounds.y.min) bounds.y.min = p.y;
      if (p.y > bounds.y.max) bounds.y.max = p.y;
    }

    // center around center with width and height max 1
    const centerX = (bounds.x.min + bounds.x.max) / 2;
    const centerY = (bounds.y.min + bounds.y.max) / 2;
    const width = bounds.x.max - bounds.x.min;
    const height = bounds.y.max - bounds.y.min;
    const scale = Math.max(width, height);

    const normalizedPoints = g.points.map((p) => ({
      x: (p.x - centerX) / scale,
      y: (p.y - centerY) / scale,
    }));

    return {
      ...g,
      points: normalizedPoints,
    };
  }
}

export const state = new AppState();
