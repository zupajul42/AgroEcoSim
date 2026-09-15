import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { geometryTriangleCount, Preview } from "../../components/designer/Preview";
import { Leaf, LeafGeometry } from "../../types/leaf";
import { state } from "../AppState";
import { pickMostDetailedLod } from "../../utils/lod";
import { fromExportableLeaf } from "../../utils/leafConfigIO";
import { downloadFile } from "../../utils/download";
import { bounds } from "../../utils/math";
import "./style.css";

// The outline of a geometry, fitted into a 120px square.
function GeomPreview({ geomId }: { geomId: string }) {
  const points = state.geoms.get(geomId)?.points;
  if (!points?.length) return <div class="card-preview" />;

  const { minX, maxX, minY, maxY, width, height } = bounds(points);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(width, height, 0.001);
  const pointsStr = points
    .map((p) => `${(60 + ((p.x - cx) / span) * 100).toFixed(1)},${(60 - ((p.y - cy) / span) * 100).toFixed(1)}`)
    .join(" ");

  return (
    <svg class="card-preview" viewBox="0 0 120 120">
      <polygon points={pointsStr} fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

/** Start page: all leaf models and geometries as cards. */
export function Library() {
  const location = useLocation();
  const [leafs, setLeafs] = useState<Leaf[]>([]);
  const [geoms, setGeoms] = useState<LeafGeometry[]>([]);

  const refresh = () => {
    setLeafs(state.leafs.all());
    setGeoms(state.geoms.all());
  };

  useEffect(() => {
    state.leafs.unselect();
    refresh();
  }, []);

  const createLeaf = () => {
    state.leafs.select(state.leafs.add(state.leafs.createDefault()));
    location.route("/leaf");
  };

  const openLeaf = (leaf: Leaf) => {
    let index = leafs.findIndex((l) => l.name === leaf.name);
    if (index === -1) index = state.leafs.add(leaf);
    state.leafs.select(index);
    location.route("/leaf");
  };

  const duplicateLeaf = (e: MouseEvent, leaf: Leaf) => {
    e.stopPropagation();
    state.leafs.add({ ...JSON.parse(JSON.stringify(leaf)), name: state.leafs.uniqueName(`${leaf.name} (Copy)`) });
    refresh();
  };

  const removeLeaf = (e: MouseEvent, leaf: Leaf) => {
    e.stopPropagation();
    if (!confirm(`Delete leaf "${leaf.name}"?`)) return;
    state.leafs.remove(leaf);
    refresh();
  };

  const createGeom = () => location.route(`/leaf/geometry/${state.geoms.createDefault().id}`);

  const duplicateGeom = (e: MouseEvent, geom: LeafGeometry) => {
    e.stopPropagation();
    state.geoms.duplicate(geom);
    refresh();
  };

  const removeGeom = (e: MouseEvent, geom: LeafGeometry) => {
    e.stopPropagation();
    const usage = state.geoms.usageCount(geom.id, leafs);
    if (usage > 0) {
      alert(`Cannot delete geometry "${geom.name}" because it is used in ${usage} leaf model(s).`);
      return;
    }
    if (!confirm(`Delete geometry "${geom.name}"?`)) return;
    state.geoms.remove(geom.id);
    refresh();
  };

  const importLeafs = async (files: FileList | null) => {
    for (const result of await Promise.allSettled([...(files ?? [])].map(readText))) {
      try {
        if (result.status === "rejected") throw result.reason;
        const leaf = fromExportableLeaf(JSON.parse(result.value));
        state.leafs.add({ ...leaf, name: state.leafs.uniqueName(leaf.name) });
      } catch (e) {
        console.error(e);
      }
    }
    refresh();
  };

  const exportGeoms = () => downloadFile("geometries.json", JSON.stringify(state.geoms.all(), null, 2));

  const cardActions = (onDuplicate: (e: MouseEvent) => void, onDelete: (e: MouseEvent) => void, what: string) => (
    <div class="card-actions">
      <button class="card-action-btn duplicate-btn" onClick={onDuplicate} title={`Duplicate ${what}`}>
        ⧉
      </button>
      <button class="card-action-btn delete-btn" onClick={onDelete} title={`Delete ${what}`}>
        ✕
      </button>
    </div>
  );

  return (
    <div class="library">
      <section>
        <div class="section-header">
          <h1>Leaf Models</h1>
          <label class="button">
            Load Config (.json)
            <input type="file" accept=".json" hidden onInput={(e) => importLeafs(e.currentTarget.files)} />
          </label>
        </div>

        <div class="leaf-list">
          {leafs.map((leaf, i) => (
            <div key={leaf.name + i} class="leaf-card" onClick={() => openLeaf(leaf)}>
              {cardActions(
                (e) => duplicateLeaf(e, leaf),
                (e) => removeLeaf(e, leaf),
                "leaf model",
              )}
              <Preview
                width="100%"
                height="180px"
                leaf={leaf}
                lod={pickMostDetailedLod(leaf.shape?.[0]?.geom, geoms)}
              />
              <div class="card-title">{leaf.name}</div>
            </div>
          ))}
          <div class="leaf-card create-card" onClick={createLeaf}>
            <span class="create-icon">+</span>
            <span>Create New Leaf</span>
          </div>
        </div>
      </section>

      <section>
        <div class="section-header">
          <h1>Leaf Geometries</h1>
          <button onClick={exportGeoms}>Export dump</button>
        </div>

        <div class="leaf-list">
          {geoms.map((g) => {
            const usageCount = state.geoms.usageCount(g.id, leafs);
            return (
              <div key={g.id} class="leaf-card" onClick={() => location.route(`/leaf/geometry/${g.id}`)}>
                {cardActions(
                  (e) => duplicateGeom(e, g),
                  (e) => removeGeom(e, g),
                  "geometry",
                )}
                <GeomPreview geomId={g.id} />
                <div class="card-title">{g.name}</div>
                <div class="card-meta">{geometryTriangleCount(g.id)} triangles</div>
                <div class="card-meta">
                  Used in {usageCount} {usageCount === 1 ? "leaf" : "leaves"}
                </div>
              </div>
            );
          })}
          <div class="leaf-card create-card" onClick={createGeom}>
            <span class="create-icon">+</span>
            <span>Create New Geometry</span>
          </div>
        </div>
      </section>
    </div>
  );
}
