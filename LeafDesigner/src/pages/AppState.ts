import { Leaf } from "../types/leaf";

const demoLeaf: Leaf = {
  name: "Chestnut",
  shape: [
    {
      geom: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ], // obovate
      margin: "serrate",
      venation: "palmate",
      folding: "none",
      petiolule: { len: 0, angle: 0, width: 0.5, x: 0.5, y: 0 },
    },
  ],
  layout: {
    type: "palmate",
    arrangement: "opposite",
    terminalLeaf: true,
    angle: 160,
  },
  instances: [
    { shape: 0, scale: 10 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
    { shape: 0, scale: 1 },
  ],
  petiole: { len: 3, angle: 0, width: 0.5, x: 0, y: 0 },
};

class AppState {
  public leafLib: Leaf[] = [];

  private _save() {
    window.localStorage.setItem("leafLib", JSON.stringify(this.leafLib));
  }

  private _load() {
    let lib = window.localStorage.getItem("leafLib");
    this.leafLib = lib ? JSON.parse(lib) : [];
    return this.leafLib;
  }

  public createDefaultLeaf(): Leaf {
    return {
      name: "Unnamed leaf",
      instances: [{ shape: 0, scale: 1 }],
      petiole: { len: 3, width: 0.1, x: 0, y: 0, angle: 0 },
      shape: [
        {
          geom: [],
          folding: "none",
          margin: "serrate",
          petiolule: { len: 0, width: 0, x: 0, y: 0, angle: 0 },
          venation: "pinnate",
        },
      ],
    };
  }

  public hasLeafWithName(name: string): boolean {
    return this._load().findIndex((l) => l.name == name) != -1;
  }

  public getLeafLib(): Leaf[] {
    if (!this.hasLeafWithName(demoLeaf.name)) {
      this.leafLib.push(demoLeaf);
      this._save();
    }
    return this.leafLib;
  }

  public addToLib(leaf: Leaf): number {
    this._load().push(leaf);
    this._save();
    return this.leafLib.length - 1;
  }

  public removeFromLib(leaf: Leaf): boolean {
    this._load();
    let i = this.leafLib.findIndex((l) => l.name == leaf.name);
    if (i != -1) {
      this.leafLib.splice(i, 1);
      this._save();
      return true;
    }
    return false;
  }

  public setSelectedLeaf(leafNdx?: number) {
    if (leafNdx > -1) {
      window.localStorage.setItem("selectedLeaf", leafNdx.toString());
    } else {
      window.localStorage.removeItem("selectedLeaf");
    }
  }

  public getSelectedLeaf(): Leaf | undefined {
    let leafNdx = +(window.localStorage.getItem("selectedLeaf") ?? -1);
    if (leafNdx == -1) return undefined;
    return this._load()[leafNdx];
  }

  public updateSelectedLeaf(leaf: Leaf) {
    let leafNdx = +(window.localStorage.getItem("selectedLeaf") ?? -1);
    if (leafNdx == -1) return undefined;

    this._load()[leafNdx] = leaf;
    this._save();
  }
}

export const state = new AppState();
