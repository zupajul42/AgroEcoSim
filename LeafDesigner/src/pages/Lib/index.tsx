import { useEffect, useState } from "preact/hooks";
import { Preview } from "../../components/designer/Preview";
import { Leaf, LeafGeometry } from "../../types/leaf";
import { useLocation } from "preact-iso";
import "./style.css";

import { state } from "../AppState";

function GeomPreview({ geomId }: { geomId: string }) {
  const norm = state.geoms.getNormalized(geomId);
  if (!norm || !norm.points || norm.points.length === 0) {
    return <div style={{ width: "120px", height: "120px" }} />;
  }

  const pts = norm.points;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const span = Math.max(maxX - minX, maxY - minY, 0.001);

  const pointsStr = pts
    .map((p) => {
      const sx = 60 + ((p.x - cx) / span) * 100;
      const sy = 60 - ((p.y - cy) / span) * 100;
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ borderRadius: "6px" }}>
      <polygon points={pointsStr} fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

export function Library() {
  const location = useLocation();
  const [leafs, setLeafs] = useState<Leaf[]>([]);
  const [geoms, setGeoms] = useState<LeafGeometry[]>([]);

  useEffect(() => {
    state.leafs.unselect();
    setLeafs(state.leafs.all());
    setGeoms(state.geoms.all());
  }, []);

  function newLeaf() {
    state.leafs.select(state.leafs.add(state.leafs.createDefault()));
    location.route("/leaf");
  }

  function openLeaf(leaf: Leaf) {
    let ndx = leafs.findIndex((l) => l.name === leaf.name);
    if (ndx === -1) ndx = state.leafs.add(leaf);
    state.leafs.select(ndx);
    location.route("/leaf");
  }

  function duplicateLeaf(e: MouseEvent, leaf: Leaf) {
    e.stopPropagation();
    const newLeaf: Leaf = JSON.parse(JSON.stringify(leaf));

    let newName = `${leaf.name} (Copy)`;
    let counter = 1;
    while (state.leafs.has(newName)) {
      counter++;
      newName = `${leaf.name} (Copy ${counter})`;
    }
    newLeaf.name = newName;

    state.leafs.add(newLeaf);
    setLeafs(state.leafs.all());
  }

  function removeLeaf(e: MouseEvent, leaf: Leaf) {
    e.stopPropagation();
    if (confirm(`Delete leaf "${leaf.name}"?`)) {
      state.leafs.remove(leaf);
      setLeafs(state.leafs.all());
    }
  }

  function newGeom() {
    const geom: LeafGeometry = {
      id: "geom:" + Math.round(Math.random() * 1000000),
      name: "New Geometry",
      points: [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: -1, y: 2 },
      ],
      veins: null,
    };
    state.geoms.add(geom);
    setGeoms(state.geoms.all());
    location.route(`/leaf/geometry/${geom.id}`);
  }

  function duplicateGeom(e: MouseEvent, geom: LeafGeometry) {
    e.stopPropagation();
    const newGeom: LeafGeometry = {
      id: "geom:" + Math.round(Math.random() * 1000000),
      name: geom.name + " (Copy)",
      points: geom.points.map((p) => ({ ...p })),
      veins: geom.veins ? JSON.parse(JSON.stringify(geom.veins)) : null,
    };
    state.geoms.add(newGeom);
    setGeoms(state.geoms.all());
  }

  function editGeom(geomId: string) {
    location.route(`/leaf/geometry/${geomId}`);
  }

  function removeGeom(e: MouseEvent, geom: LeafGeometry) {
    e.stopPropagation();
    const usage = state.geoms.getUsageCount(geom.id, leafs);
    if (usage > 0) {
      alert(`Cannot delete geometry "${geom.name}" because it is used in ${usage} leaf model(s).`);
      return;
    }
    if (confirm(`Delete geometry "${geom.name}"?`)) {
      state.geoms.remove(geom.id);
      setGeoms(state.geoms.all());
    }
  }

  async function readText(file: File) {
    return new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = (ev) => res(ev.target?.result as string);
      reader.onerror = (e) => rej(e);
      reader.readAsText(file);
    });
  }

  async function loadLeaf(ev: any) {
    const files: FileList = ev.target.files;
    const promises = await Promise.allSettled([...files].map((f) => readText(f)));
    for (const p of promises) {
      try {
        if (p.status === "rejected") throw new Error("File load error");
        const leaf = JSON.parse(p.value);
        state.leafs.add(leaf);
      } catch (e) {
        console.error(e);
      }
    }
    setLeafs(state.leafs.all());
  }

  return (
    <div className="library">
      {/* Leafs Section */}
      <section style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h1>Leaf Models</h1>
          <div>
            <label htmlFor="configPicker" style={{ cursor: "pointer" }}>
              <span className="btn-label">Load Config (.json)</span>
            </label>
            <input
              type="file"
              id="configPicker"
              accept=".json"
              onInput={(e) => loadLeaf(e)}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="leaf-list">
          {leafs.map((leaf, i) => (
            <div key={leaf.name + i} className="leaf-card" onClick={() => openLeaf(leaf)}>
              <div className="card-actions">
                <button
                  className="card-action-btn duplicate-btn"
                  onClick={(e) => duplicateLeaf(e, leaf)}
                  title="Duplicate leaf model"
                >
                  ⧉
                </button>
                <button
                  className="card-action-btn delete-btn"
                  onClick={(e) => removeLeaf(e, leaf)}
                  title="Delete leaf model"
                >
                  ✕
                </button>
              </div>
              <Preview width={"100%"} height={"180px"} leaf={leaf} />
              <div style={{ marginTop: "0.5rem", fontWeight: "bold" }}>{leaf.name}</div>
            </div>
          ))}

          <div className="leaf-card create-card" onClick={() => newLeaf()}>
            <span style={{ fontSize: "2.5rem" }}>+</span>
            <span>Create New Leaf</span>
          </div>
        </div>
      </section>

      {/* Geometries Section */}
      <section>
        <div style={{ marginBottom: "1rem" }}>
          <h1>Leaf Geometries</h1>
        </div>

        <div className="leaf-list">
          {geoms.map((g) => {
            const usageCount = state.geoms.getUsageCount(g.id, leafs);
            return (
              <div key={g.id} className="leaf-card" onClick={() => editGeom(g.id)}>
                <div className="card-actions">
                  <button
                    className="card-action-btn duplicate-btn"
                    onClick={(e) => duplicateGeom(e, g)}
                    title="Duplicate geometry"
                  >
                    ⧉
                  </button>
                  <button
                    className="card-action-btn delete-btn"
                    onClick={(e) => removeGeom(e, g)}
                    title="Delete geometry"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "center", padding: "0.25rem" }}>
                  <GeomPreview geomId={g.id} />
                </div>
                <div style={{ marginTop: "0.5rem", fontWeight: "bold" }}>{g.name}</div>
                <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{g.points.length} points</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: "2px" }}>
                  Used in {usageCount} {usageCount === 1 ? "leaf" : "leaves"}
                </div>
              </div>
            );
          })}

          <div className="leaf-card create-card" onClick={() => newGeom()}>
            <span style={{ fontSize: "2.5rem" }}>+</span>
            <span>Create New Geometry</span>
          </div>
        </div>
      </section>
    </div>
  );
}
