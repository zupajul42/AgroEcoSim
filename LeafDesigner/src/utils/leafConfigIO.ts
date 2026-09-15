import { Leaf, LeafGeometry, LeafShape } from "../types/leaf";
import { state } from "../pages/AppState";

// A leaf config file carries its custom geometries inline; built-in ones stay as ids.
type ExportableLeaf = Omit<Leaf, "shape"> & {
  shape: (Omit<LeafShape, "geom"> & { geom: (string | LeafGeometry)[] })[];
};

export function toExportableLeaf(leaf: Leaf): ExportableLeaf {
  return {
    ...leaf,
    shape: leaf.shape.map((s) => ({
      ...s,
      geom: (s.geom ?? []).map((id) => (id.startsWith("def:") ? id : (state.geoms.get(id) ?? id))),
    })),
  };
}

function isEmbeddedGeometry(value: unknown): value is LeafGeometry {
  return typeof value === "object" && value !== null && Array.isArray((value as LeafGeometry).points);
}

/** Parsed config file -> Leaf; embedded geometries are added to the library under fresh ids. */
export function fromExportableLeaf(raw: any): Leaf {
  const shapes = Array.isArray(raw?.shape) ? raw.shape : [];
  const shape = shapes.map((s: any) => ({
    ...s,
    geom: (Array.isArray(s?.geom) ? s.geom : [s?.geom]).map((slot: string | LeafGeometry) =>
      isEmbeddedGeometry(slot) ? state.geoms.duplicate(slot, slot.name ?? "Imported Geometry").id : slot,
    ),
  }));
  return { ...raw, shape };
}
