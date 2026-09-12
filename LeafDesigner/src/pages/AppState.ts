import * as Geometries from "./PredefinedGeometries";
import { Leaf, LeafGeometry, VeinNode } from "../types/leaf";
import { createDefaultLodGeom } from "../utils/lod";
import { DEFAULT_COLOR_RAMP } from "../utils/colorRamp";
import { generateOutlineFromVeins, generateVeinMesh } from "../utils/veinGenerator";

const demoLeaf: Leaf = {
  name: "Chestnut",
  shape: [
    {
      geom: ["def:obovate"],
      petiolule: { len: 0.2, angle: 0, width: 0.1, x: 0, y: 0 },
    },
  ],
  layout: {
    type: "palmate",
    arrangement: "opposite",
    terminalLeaf: true,
    angle: 210,
  },
  instances: [
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
  ],
  petiole: { len: 1.5, angle: 0, width: 0.15, x: 0, y: 0 },
};


class AppState {
  leafs: LeafStorage;
  geoms: GeometryStorage;

  constructor() {
    this.geoms = new GeometryStorage();
    this.leafs = new LeafStorage();
  }

  // generate meshes and check if there are any problems with the data
  storageProblem(): string | null {
    try {
      for (const g of this.geoms.all()) {
        if (typeof g.id !== "string" || !Array.isArray(g.points)) return `Geometry ${JSON.stringify(g?.name ?? g?.id)} has no id or points.`;
        if (g.points.some((p) => typeof p?.x !== "number" || typeof p?.y !== "number")) return `Geometry "${g.name}" has invalid points.`;
        if (g.veins?.root) {
          const validNode = (n: VeinNode): boolean =>
            typeof n?.x === "number" && typeof n?.y === "number" && Array.isArray(n.children) && n.children.every(validNode);
          if (!validNode(g.veins.root)) return `Geometry "${g.name}" has an invalid vein node.`;
          generateOutlineFromVeins(g.veins, { mirrorX: true });
          generateVeinMesh(g.veins);
        }
      }
      for (const l of this.leafs.all()) {
        if (typeof l.name !== "string" || !Array.isArray(l.shape) || !Array.isArray(l.instances) || !l.petiole) {
          return `Leaf ${JSON.stringify(l?.name)} is missing shape, instances or petiole.`;
        }
      }
      return null;
    } catch (e) {
      return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
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
          geom: createDefaultLodGeom(),
          petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 },
        },
      ],
      colorRamp: DEFAULT_COLOR_RAMP.map((s) => ({ ...s })),
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
    for (const p of Geometries.all) {
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

  public remove(id: string): boolean {
    this._load();
    const i = this.leafGeoms.findIndex((g) => g.id === id);
    if (i !== -1) {
      this.leafGeoms.splice(i, 1);
      this._save();
      return true;
    }
    return false;
  }

  public getUsageCount(id: string, leafs: Leaf[]): number {
    if (!leafs) return 0;
    return leafs.filter((l) =>
      l.shape?.some((s) => (Array.isArray(s.geom) ? s.geom.includes(id) : s.geom === id)),
    ).length;
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

    // scale uniformly but keep origin (0,0) as stem attachment point
    const width = bounds.x.max - bounds.x.min;
    const height = bounds.y.max - bounds.y.min;
    const scale = Math.max(width, height, 0.0001);

    const normalizedPoints = g.points.map((p) => ({
      x: p.x / scale,
      y: p.y / scale,
    }));

    return {
      ...g,
      points: normalizedPoints,
    };
  }
}

export const state = new AppState();
