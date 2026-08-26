import { useEffect, useRef, useState } from "preact/hooks";
import {
  Leaf,
  LeafArrangement,
  LeafGeometry,
  LeafInstance,
  LeafLayout,
  LeafLayoutType,
} from "../../types/leaf";
import { generateMesh, meshToObjString, Preview } from "../../components/designer/Preview";
import "./style.css";
import { state } from "../AppState";
import { useInsertionEffect } from "preact/compat";
import {
  addLodGeom,
  getLodCount,
  removeLodGeom,
  removeLodScale,
  resolveLodGeom,
  resolveLodScale,
  withLodGeom,
  withLodScale,
} from "../../utils/lod";

import { useLocation } from "preact-iso";
import { useHistory } from "../../hooks/useHistory";
import { SliderInput } from "../../components/common/SliderInput";

interface SliderProp {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
  onInput: (val: number) => void;
}

export function LeafDesigner(props: { leaf?: Leaf }) {
  const location = useLocation();
  const startLeaf = props?.leaf ?? state.leafs.selected() ?? null;

  const [isEdit, setIsEdit] = useState<boolean>(!!state.leafs.selected());

  const {
    state: leaf,
    set: setLeaf,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<Leaf>(startLeaf);
  const [leafGeom, setLeafGeom] = useState<LeafGeometry>();
  const [leafGeometries, setLeafGeometries] = useState<LeafGeometry[]>([]);
  const [isCompound, setIsCompound] = useState<boolean>(startLeaf?.instances?.length > 1);
  const [isChanged, setChanged] = useState<boolean>(false);
  // Which level of detail is being previewed/edited — 0 (highest detail) by default.
  // Each leaf shape can point at a different geometry per LOD; this just picks which slot
  // the Geometry select below reads/writes and which one the 3D preview renders.
  const [activeLod, setActiveLod] = useState<number>(0);
  const isInitialLoad = useRef(true);

  const savedCompoundInstances = useRef<LeafInstance[]>(
    startLeaf?.instances?.length > 1
      ? startLeaf.instances
      : [
          { shape: 0, scale: 1 },
          { shape: 0, scale: 1 },
          { shape: 0, scale: 1 },
          { shape: 0, scale: 1 },
          { shape: 0, scale: 1 },
        ]
  );

  const savedCompoundLayout = useRef<LeafLayout>(
    startLeaf?.layout || {
      type: "palmate",
      arrangement: "opposite",
      terminalLeaf: true,
      angle: 140,
    }
  );

  const handleSetCompound = (compound: boolean) => {
    setIsCompound(compound);
    if (!compound) {
      if (leaf.instances && leaf.instances.length > 1) {
        savedCompoundInstances.current = leaf.instances;
      }
      if (leaf.layout) {
        savedCompoundLayout.current = leaf.layout;
      }
      const currentScale = leaf.instances[0]?.scale || 1.0;
      updateLeaf((prev) => ({
        instances: [{ shape: 0, scale: currentScale }],
      }));
    } else {
      const instancesToRestore =
        savedCompoundInstances.current.length > 1
          ? savedCompoundInstances.current
          : [
              { shape: 0, scale: 1 },
              { shape: 0, scale: 1 },
              { shape: 0, scale: 1 },
              { shape: 0, scale: 1 },
              { shape: 0, scale: 1 },
            ];
      const layoutToRestore = savedCompoundLayout.current;
      updateLeaf((prev) => ({
        instances: instancesToRestore,
        layout: layoutToRestore,
      }));
    }
  };

  useEffect(() => {
    setTimeout(() => (isInitialLoad.current = false), 100);
    const geoms = state.geoms.all();
    setLeafGeometries(geoms);

    if (!leaf) {
      // Auto-load default if available
      const selected = state.leafs.selected();
      if (selected) setLeaf(selected);
      else {
        const allLeafs = state.leafs.all();
        if (allLeafs.length > 0) {
          state.leafs.select(0);
          setLeaf(allLeafs[0]);
        }
      }
    }
  }, []);

  useEffect(() => {
    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.code == "KeyS" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        save();
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        if (ev.shiftKey) {
          ev.preventDefault();
          handleRedo();
        } else {
          ev.preventDefault();
          handleUndo();
        }
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        handleRedo();
      }
    };

    if (leaf && leaf.shape && leaf.shape[0]) {
      const geoms = state.geoms.all();
      const activeGeomId = resolveLodGeom(leaf.shape[0].geom, activeLod);
      const current = geoms.find((g) => g.id == activeGeomId);
      if (current) {
        setLeafGeom(current);
      } else if (geoms.length > 0) {
        setLeafGeom(geoms[0]);
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [leaf, activeLod]);

  /* useEffect(() => { // resets instances when switching or loading
    if (isCompound) updateLeaf(() => ({ instances: Array(5).fill({ shape: 0, scale: 1 }) }));
    else updateLeaf(() => ({ instances: [{ shape: 0, scale: 1 }] }));
  }, [isCompound]); */

  const updateLeaf = (updater: (prev: Leaf) => Partial<Leaf>) => {
    if (!isInitialLoad.current) setChanged(true);
    setLeaf((prev) => ({ ...prev, ...updater(prev) }));
  };

  const handleInstance = (action: "add" | "remove" | "scale", index?: number, scale?: number) => {
    updateLeaf((prev) => {
      let instances = [...prev.instances];
      if (action === "add") instances.push({ shape: 0, scale: 1.0 });
      if (action === "remove" && instances.length > 1 && index !== undefined) {
        instances = instances.filter((_, i) => i !== index);
      }
      if (action === "scale" && index !== undefined && scale !== undefined) {
        instances[index] = { ...instances[index], scale };
      }
      return { instances };
    });
  };

  const handleGeomChange = (id: string) => {
    if (id == "def:__new") {
      createGeom();
      return;
    }

    const geoms = state.geoms.all();
    const geom = geoms.find((g) => g.id == id);
    if (!geom) {
      console.warn("Could not find geometry:", id);
      return;
    }
    setLeafGeom(geom);
    updateLeaf((p) => ({ shape: [{ ...p.shape[0], geom: withLodGeom(p.shape[0].geom, activeLod, geom.id) }] }));
  };

  const handleExportMesh = () => {
    // create Wavefront - Obj file from point array and petiole
    const objStr = meshToObjString(generateMesh(leaf), leaf.name);
    const blob = new Blob([objStr], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = leaf.name + ".obj";
    a.href = URL.createObjectURL(blob);
    a.click();
    a.remove();
  };
  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(leaf, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = leaf.name + ".json";
    a.href = URL.createObjectURL(blob);
    a.click();
    a.remove();
  };

  const save = () => {
    if (isEdit) state.leafs.updateSelected(leaf);
    else {
      state.leafs.select(state.leafs.add(leaf));
      setLeaf(state.leafs.selected());
      setIsEdit(true);
    }
    setChanged(false);
  };

  useEffect(() => {
    if (!isChanged) return;
    save();
  }, [leaf, isChanged]);

  const handleUndo = () => {
    undo();
    setChanged(true);
  };
  const handleRedo = () => {
    redo();
    setChanged(true);
  };

  const handleAddLod = () => {
    const { geom, index } = addLodGeom(leaf.shape[0].geom, resolveLodGeom(leaf.shape[0].geom, activeLod));
    updateLeaf((prev) => {
      const shape = [...prev.shape];
      shape[0] = { ...shape[0], geom };
      return { shape };
    });
    setActiveLod(index);
  };

  const handleDeleteLod = () => {
    if (getLodCount(leaf.shape[0].geom) <= 1) return;
    const removedIndex = activeLod;
    updateLeaf((prev) => {
      const shape = [...prev.shape];
      shape[0] = {
        ...shape[0],
        geom: removeLodGeom(shape[0].geom, removedIndex),
        scaleX: removeLodScale(shape[0].scaleX, removedIndex),
        scaleY: removeLodScale(shape[0].scaleY, removedIndex),
      };
      return { shape };
    });
    setActiveLod((prevLod) => Math.min(prevLod, getLodCount(leaf.shape[0].geom) - 2));
  };

  const editGeom = () => {
    if (leafGeom?.id) location.route("/leaf/geometry/" + leafGeom.id);
  };

  const createGeom = (start?: LeafGeometry) => {
    const newGeom: LeafGeometry = start
      ? {
          id: "geom:" + Math.round(Math.random() * 1000000),
          name: start.name + " (Copy)",
          points: start.points.map((p) => ({ ...p })),
          veins: start.veins ? JSON.parse(JSON.stringify(start.veins)) : null,
        }
      : {
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

    state.geoms.add(newGeom);
    setLeafGeometries(state.geoms.all());
    setLeafGeom(newGeom);

    updateLeaf((prev) => {
      const shape = [...prev.shape];
      shape[0] = { ...shape[0], geom: withLodGeom(shape[0].geom, activeLod, newGeom.id) };
      const updated = { ...prev, shape };
      state.leafs.updateSelected(updated);
      return updated;
    });

    location.route("/leaf/geometry/" + newGeom.id);
  };

  const handleCreateNewLeaf = () => {
    const newL = state.leafs.createDefault();
    const ndx = state.leafs.add(newL);
    state.leafs.select(ndx);
    setLeaf(newL);
    setIsEdit(true);
  };



  const renderSelect = (
    label: string,
    value: string,
    options: { value: string; label: string }[],
    onChange: (val: string) => void,
  ) => (
    <div class="stack">
      <label>{label}</label>
      <select class="full-width" value={value} onChange={(e) => onChange(e.currentTarget.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const stemSliderConfig = (type: "petiolule" | "petiole") => {
    const isPetiolule = type === "petiolule";
    const target = isPetiolule ? leaf?.shape[0]?.petiolule : leaf?.petiole;

    return [
      {
        label: "Length",
        field: "len",
        min: isPetiolule ? 0 : 0.5,
        max: isPetiolule ? 5 : 10,
        step: 0.1,
        unit: "m",
        value: target?.len || 0,
        defaultValue: isPetiolule ? 0 : 3,
      },
      {
        label: "Width",
        field: "width",
        min: 0.05,
        max: isPetiolule ? 1 : 1.5,
        step: 0.05,
        unit: "m",
        value: target?.width || 0.1,
        defaultValue: 0.1,
      },
      {
        label: "Angle",
        field: "angle",
        min: -90,
        max: 90,
        step: 1,
        unit: "°",
        value: target?.angle || 0,
        defaultValue: 0,
      },
    ];
  };

  return (
    <div>
      {!leaf && (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <h2>No Leaf Loaded</h2>
          <p style={{ marginBottom: "1rem" }}>You can create a new leaf or load one from your library.</p>
          <button onClick={handleCreateNewLeaf}>Create New Leaf</button>
        </div>
      )}
      {!!leaf && (
        <div class="designer-layout">
          <aside class="config-sidebar stack" style={{ gap: "24px" }}>
            <div className="stack" style={{ gap: "8px" }}>
              <div className="row">
                <h2>Leaf Designer</h2>
                <button onClick={() => location.route("/")}>Back to Library</button>
              </div>
              <div class="btn-group" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z / Cmd+Z)">
                  Undo
                </button>
                <button onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Y / Cmd+Shift+Z)">
                  Redo
                </button>
                <button onClick={handleExportMesh}>Export Mesh</button>
                <button onClick={handleExportConfig}>Export Config</button>
                <button
                  onClick={handleDeleteLod}
                  disabled={getLodCount(leaf.shape[0].geom) <= 1}
                  title={`Delete LOD ${activeLod} (the one shown in the preview)`}
                >
                  Delete LOD
                </button>
              </div>
            </div>

            {/* name & type */}
            <div class="stack">
              <input
                type="text"
                class="full-width"
                value={leaf.name}
                onInput={(e) => updateLeaf(() => ({ name: e.currentTarget.value }))}
                placeholder="Leaf Name"
              />
              <div class="row" style={{ justifyContent: "flex-start", gap: "20px" }}>
                <label class="row">
                  <input type="radio" name="type" checked={!isCompound} onChange={() => handleSetCompound(false)} />
                  <span>Simple Leaf</span>
                </label>
                <label class="row">
                  <input type="radio" name="type" checked={isCompound} onChange={() => handleSetCompound(true)} />
                  <span>Compound Leaf</span>
                </label>
              </div>
            </div>

            {/* if compound leaf -> choose layout */}
            {isCompound && (
              <div class="stack" style={{ gap: "14px" }}>
                <h3>Layout</h3>
                <div class="stack">
                  <h4>Distribution</h4>

                  {renderSelect(
                    "Type",
                    leaf.layout?.type,
                    [
                      { value: "palmate", label: "Palmate" },
                      { value: "pinnate", label: "Pinnate" },
                    ],
                    (val) =>
                      updateLeaf((prev) => ({
                        layout: {
                          ...prev.layout,
                          type: val as LeafLayoutType,
                          angle: val === "pinnate" ? 60 : 140,
                        },
                      })),
                  )}

                  {renderSelect(
                    "Arrangement",
                    leaf.layout?.arrangement,
                    [
                      { value: "opposite", label: "Opposite" },
                      { value: "alternate", label: "Alternate" },
                    ],
                    (val) =>
                      updateLeaf((prev) => ({ layout: { ...prev.layout, arrangement: val as LeafArrangement } })),
                  )}

                  {leaf.layout?.type === "pinnate" ? (
                    <SliderInput
                      label="Branch Angle"
                      min={5}
                      max={90}
                      step={1}
                      unit="°"
                      value={leaf.layout?.angle || 0}
                      onInput={(val) => updateLeaf((prev) => ({ layout: { ...prev.layout, angle: val } }))}
                      defaultValue={60}
                    />
                  ) : (
                    <SliderInput
                      label="Fanning Angle"
                      min={0}
                      max={360}
                      step={5}
                      unit="°"
                      value={leaf.layout?.angle || 0}
                      onInput={(val) => updateLeaf((prev) => ({ layout: { ...prev.layout, angle: val } }))}
                      defaultValue={140}
                    />
                  )}

                  {leaf.layout?.type === "pinnate" && (
                    <SliderInput
                      label="Leaflet Distribution"
                      min={0.05}
                      max={1}
                      step={0.05}
                      unit="x"
                      value={leaf.layout?.distributionCurve || 1}
                      onInput={(val) =>
                        updateLeaf((prev) => ({ layout: { ...prev.layout, distributionCurve: val } }))
                      }
                      defaultValue={1}
                    />
                  )}

                  <label class="row" style={{ justifyContent: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={leaf.layout?.terminalLeaf}
                      onChange={(e) =>
                        updateLeaf((prev) => ({ layout: { ...prev.layout, terminalLeaf: e.currentTarget.checked } }))
                      }
                    />
                    <span>Terminal Leaf</span>
                  </label>
                </div>

                <div class="stack">
                  <div class="row">
                    <h4>Instances ({leaf.instances.length})</h4>
                    <button onClick={() => handleInstance("add")}>+ Add</button>
                  </div>

                  <div class="instances-list stack">
                    {leaf.instances.map((instance, index) => (
                      <div key={index} class="row" style={{ alignItems: "center" }}>
                        <SliderInput
                          label={`#${index + 1}`}
                          min={0.1}
                          max={3.0}
                          step={0.05}
                          unit="x"
                          value={instance.scale}
                          onInput={(val) => handleInstance("scale", index, val)}
                          defaultValue={1}
                          inline={true}
                          style={{flex: "1"}}
                        />
                        {leaf.instances.length > 1 && (
                          <button onClick={() => handleInstance("remove", index)} title="Remove instance">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* leaf geometry and morphology */}
            <div class="stack" style={{ gap: "14px" }}>
              <h3>{isCompound ? "Leaflet" : "Leaf"}</h3>
              <div class="stack">
                <h4>Geometry (LOD {activeLod})</h4>
                <div class="row">
                  <select class="full-width" onChange={(e) => handleGeomChange((e.target as any).value)}>
                    {leafGeometries.map((geom) => (
                      <option value={geom.id} selected={geom.id == resolveLodGeom(leaf.shape[0].geom, activeLod)}>
                        {geom.name} ({geom.points.length} Pts)
                      </option>
                    ))}
                    <option value="def:__new">New</option>
                  </select>
                  {leafGeom ? (
                    <>
                      <button onClick={() => editGeom()}>Edit</button>
                      <button onClick={() => createGeom(leafGeom)}>Copy and Edit</button>
                    </>
                  ) : (
                    <button onClick={() => createGeom()}>Create New</button>
                  )}
                </div>

                {!isCompound && (
                  <SliderInput
                    label="Leaf Scale"
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    unit="x"
                    value={leaf.instances[0]?.scale || 1.0}
                    onInput={(val) =>
                      updateLeaf((prev) => ({
                        instances: [{ shape: 0, scale: val }],
                      }))
                    }
                    defaultValue={1}
                  />
                )}

                <SliderInput
                  label="Blade Scale X"
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  unit="x"
                  value={resolveLodScale(leaf.shape[0].scaleX, activeLod)}
                  onInput={(val) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = { ...shape[0], scaleX: withLodScale(shape[0].scaleX, activeLod, val) };
                      return { shape };
                    })
                  }
                  defaultValue={1}
                />
                <SliderInput
                  label="Blade Scale Y"
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  unit="x"
                  value={resolveLodScale(leaf.shape[0].scaleY, activeLod)}
                  onInput={(val) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = { ...shape[0], scaleY: withLodScale(shape[0].scaleY, activeLod, val) };
                      return { shape };
                    })
                  }
                  defaultValue={1}
                />
              </div>

            </div>

            {/* petiole & stem */}
            <div class="stack" style={{ gap: "14px" }}>
              <h3>{isCompound ? "Petiole & Stems" : "Petiole & Stem"}</h3>

              {/* leaflet stem (offset rotation to stem) */}
              {isCompound && (
                <div class="stack">
                  <h4>Leaflet Stem (Petiolule)</h4>
                  {stemSliderConfig("petiolule").map((p) => (
                    <SliderInput
                      key={p.label}
                      label={p.label}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      unit={p.unit}
                      value={p.value}
                      onInput={(val) =>
                        updateLeaf((prev) => {
                          const shape = [...prev.shape];
                          shape[0] = { ...shape[0], petiolule: { ...shape[0].petiolule, [p.field]: val } };
                          return { shape };
                        })
                      }
                      defaultValue={p.defaultValue}
                    />
                  ))}
                </div>
              )}

              {/* main stem (petiole) */}
              <div class="stack">
                <h4>Main Stem (Petiole)</h4>
                {stemSliderConfig("petiole").map((s) => (
                  <SliderInput
                    key={s.label}
                    label={s.label}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    unit={s.unit}
                    value={s.value}
                    onInput={(val) => updateLeaf((prev) => ({ petiole: { ...prev.petiole, [s.field]: val } }))}
                    defaultValue={s.defaultValue}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* viewwport */}
          <main class="preview-container">
            <div class="preview-overlay-top-left">
              <div class="lod-switcher" title="Level of detail previewed — the Geometry select edits this LOD's geometry">
                {Array.from({ length: getLodCount(leaf.shape[0].geom) }, (_, level) => (
                  <button
                    key={level}
                    class={`lod-btn ${activeLod === level ? "active" : ""}`}
                    onClick={() => setActiveLod(level)}
                  >
                    {level}
                  </button>
                ))}
                <button class="lod-btn" onClick={handleAddLod} title="Add a new LOD">
                  +
                </button>
              </div>
            </div>
            <Preview leaf={leaf} width={"100%"} height={"100%"} controls={true} showAxis={true} lod={activeLod} />
          </main>
        </div>
      )}
    </div>
  );
}
