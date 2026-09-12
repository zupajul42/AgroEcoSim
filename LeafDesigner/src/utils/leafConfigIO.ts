import { Leaf, LeafGeometry, LeafShape } from "../types/leaf";
import { state } from "../pages/AppState";

export type ExportableLeaf = Omit<Leaf, "shape"> & {
  shape: (Omit<LeafShape, "geom"> & { geom: (string | LeafGeometry)[] })[];
};

export function toExportableLeaf(leaf: Leaf): ExportableLeaf {
  return {
    ...leaf,
    shape: leaf.shape.map((s) => ({
      ...s,
      geom: (s.geom ?? []).map((id) => {
        if (typeof id !== "string" || id.startsWith("def:")) return id;
        return state.geoms.get(id) ?? id;
      }),
    })),
  };
}

function isEmbeddedGeometry(value: unknown): value is LeafGeometry {
  return !!value && typeof value === "object" && Array.isArray((value as LeafGeometry).points);
}

export function fromExportableLeaf(raw: any): Leaf {
  const shapes = Array.isArray(raw?.shape) ? raw.shape : [];
  const shape = shapes.map((s: any) => ({
    ...s,
    geom: (Array.isArray(s?.geom) ? s.geom : [s?.geom]).map((slot: string | LeafGeometry) => {
      if (typeof slot === "string") return slot;
      if (isEmbeddedGeometry(slot)) {
        const geom: LeafGeometry = { ...slot, id: "geom:" + Math.round(Math.random() * 1000000) };
        state.geoms.add(geom);
        return geom.id;
      }
      return slot; // unrecognized shape — leave as-is, no silently dropping it
    }),
  }));
  return { ...raw, shape };
}
