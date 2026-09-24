import { PREDEFINED_GEOMETRIES } from "./PredefinedGeometries";
import { Leaf, LeafGeometry, VeinNode } from "../types/leaf";
import { createDefaultLodGeom } from "../utils/lod";
import { DEFAULT_COLOR_RAMP } from "../utils/colorRamp";
import { generateOutlineFromVeins, generateVeinMesh } from "../utils/veinGenerator";
import { newId } from "../utils/random";

export const STORAGE_KEYS = { leafs: "leafLib", geoms: "geomLib", selected: "selectedLeaf" };

const demoLeaf: Leaf = {
  name: "Chestnut",
  shape: [{ geom: ["def:obovate"], petiolule: { len: 0.2, angle: 0, width: 0.1, x: 0, y: 0 } }],
  layout: { type: "palmate", arrangement: "opposite", terminalLeaf: true, angle: 210 },
  instances: Array.from({ length: 5 }, () => ({ shape: 0, scale: 1 })),
  petiole: { len: 1.5, angle: 0, width: 0.15, x: 0, y: 0 },
};

class AppState {
  leafs = new LeafStorage();
  geoms = new GeometryStorage();

  /** Why the stored data can't be used by this version, or null when it loads fine. */
  storageProblem(): string | null {
    const validNode = (n: VeinNode): boolean =>
      typeof n?.x === "number" && typeof n?.y === "number" && Array.isArray(n.children) && n.children.every(validNode);
    try {
      for (const g of this.geoms.all()) {
        if (typeof g.id !== "string" || !Array.isArray(g.points)) {
          return `Geometry ${JSON.stringify(g?.name ?? g?.id)} has no id or points.`;
        }
        if (g.points.some((p) => typeof p?.x !== "number" || typeof p?.y !== "number")) {
          return `Geometry "${g.name}" has invalid points.`;
        }
        if (g.veins?.root) {
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

  private save() {
    window.localStorage.setItem(STORAGE_KEYS.leafs, JSON.stringify(this.leafLib));
  }

  private load() {
    const lib = window.localStorage.getItem(STORAGE_KEYS.leafs);
    this.leafLib = lib ? JSON.parse(lib) : [];
    return this.leafLib;
  }

  private selectedIndex() {
    return +(window.localStorage.getItem(STORAGE_KEYS.selected) ?? -1);
  }

  createDefault(): Leaf {
    return {
      name: "Unnamed leaf",
      instances: [{ shape: 0, scale: 1 }],
      petiole: { len: 3, width: 0.1, x: 0, y: 0, angle: 0 },
      shape: [{ geom: createDefaultLodGeom(), petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 } }],
      colorRamp: DEFAULT_COLOR_RAMP.map((s) => ({ ...s })),
    };
  }

  has(name: string): boolean {
    return this.load().some((l) => l.name === name);
  }

  /** `base`, or `base (2)`, `base (3)`, ... if that name is taken. */
  uniqueName(base: string): string {
    let name = base;
    for (let counter = 2; this.has(name); counter++) name = `${base} (${counter})`;
    return name;
  }

  all(): Leaf[] {
    if (!this.has(demoLeaf.name)) {
      this.leafLib.push(demoLeaf);
      this.save();
    }
    return this.leafLib;
  }

  add(leaf: Leaf): number {
    this.load().push(leaf);
    this.save();
    return this.leafLib.length - 1;
  }

  remove(leaf: Leaf): boolean {
    const i = this.load().findIndex((l) => l.name === leaf.name);
    if (i === -1) return false;
    this.leafLib.splice(i, 1);
    this.save();
    return true;
  }

  select(index: number) {
    if (index < 0) this.unselect();
    else window.localStorage.setItem(STORAGE_KEYS.selected, index.toString());
  }

  unselect() {
    window.localStorage.removeItem(STORAGE_KEYS.selected);
  }

  selected(): Leaf | undefined {
    const i = this.selectedIndex();
    return i === -1 ? undefined : this.load()[i];
  }

  updateSelected(leaf: Leaf) {
    const i = this.selectedIndex();
    if (i === -1) return;
    this.load()[i] = leaf;
    this.save();
  }
}

class GeometryStorage {
  private geomLib: LeafGeometry[] = [];

  public revision: number = 0;

  private save() {
    window.localStorage.setItem(STORAGE_KEYS.geoms, JSON.stringify(this.geomLib));
    this.revision++;
  }

  private load() {
    const lib = window.localStorage.getItem(STORAGE_KEYS.geoms);
    this.geomLib = lib ? JSON.parse(lib) : [];
    return this.geomLib;
  }

  /** All stored geometries; the built-in ones are added on first use. */
  all(): LeafGeometry[] {
    this.load();
    for (const p of PREDEFINED_GEOMETRIES) {
      if (!this.geomLib.some((g) => g.id === p.id)) {
        this.geomLib.push(p);
        this.save();
      }
    }
    return this.geomLib;
  }

  get(id: string) {
    return this.all().find((g) => g.id === id);
  }

  /** A new editable geometry (a plain quad) added to the library. */
  createDefault(): LeafGeometry {
    return this.add({
      id: newId("geom:"),
      name: "New Geometry",
      points: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: -1, y: 2 },
      ],
      veins: null,
    });
  }

  /** A deep copy of `geom` under a fresh id, added to the library. */
  duplicate(geom: LeafGeometry, name = geom.name + " (Copy)"): LeafGeometry {
    return this.add({ ...JSON.parse(JSON.stringify(geom)), id: newId("geom:"), name });
  }

  add(geom: LeafGeometry): LeafGeometry {
    this.load().push(geom);
    this.save();
    return geom;
  }

  updateById(id: string, geom: LeafGeometry): boolean {
    const i = this.load().findIndex((g) => g.id === id);
    if (i === -1) return false;
    this.geomLib[i] = geom;
    this.save();
    return true;
  }

  remove(id: string): boolean {
    const i = this.load().findIndex((g) => g.id === id);
    if (i === -1) return false;
    this.geomLib.splice(i, 1);
    this.save();
    return true;
  }

  usageCount(id: string, leafs: Leaf[]): number {
    return leafs.filter((l) => l.shape?.some((s) => s.geom?.includes(id))).length;
  }
}

export const state = new AppState();
