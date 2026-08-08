import { useEffect, useRef, useState } from "preact/hooks";
import {
  Leaf,
  LeafArrangement,
  LeafFolding,
  LeafGeometry,
  LeafInstance,
  LeafLayout,
  LeafLayoutType,
  LeafMargin,
  LeafVenation,
} from "../../types/leaf";
import { generateMesh, meshToObjString, Preview } from "../../components/designer/Preview";
import "./style.css";
import { state } from "../AppState";
import { useInsertionEffect } from "preact/compat";

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
          redo();
        } else {
          ev.preventDefault();
          undo();
        }
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        redo();
      }
    };

    if (leaf && leaf.shape && leaf.shape[0]) {
      const geoms = state.geoms.all();
      const current = geoms.find((g) => g.id == leaf.shape[0].geom);
      if (current) {
        setLeafGeom(current);
      } else if (geoms.length > 0) {
        setLeafGeom(geoms[0]);
      }
    }

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [leaf]);

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
    updateLeaf((p) => ({ shape: [{ ...p.shape[0], geom: geom.id }] }));
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
      shape[0] = { ...shape[0], geom: newGeom.id };
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
      },
      {
        label: "Width",
        field: "width",
        min: 0.05,
        max: isPetiolule ? 1 : 1.5,
        step: 0.05,
        unit: "m",
        value: target?.width || 0.1,
      },
      { label: "Angle", field: "angle", min: -90, max: 90, step: 1, unit: "°", value: target?.angle || 0 },
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
                <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z / Cmd+Z)">
                  Undo
                </button>
                <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y / Cmd+Shift+Z)">
                  Redo
                </button>
                <button onClick={handleExportMesh}>Export Mesh</button>
                <button onClick={handleExportConfig}>Export Config</button>
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
                    (val) => updateLeaf((prev) => ({ layout: { ...prev.layout, type: val as LeafLayoutType } })),
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

                  <SliderInput
                    label="Fanning Angle"
                    min={0}
                    max={360}
                    step={5}
                    unit="°"
                    value={leaf.layout?.angle || 0}
                    onInput={(val) => updateLeaf((prev) => ({ layout: { ...prev.layout, angle: val } }))}
                  />

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
                <h4>Geometry</h4>
                <div class="row">
                  <select class="full-width" onChange={(e) => handleGeomChange((e.target as any).value)}>
                    {leafGeometries.map((geom) => (
                      <option value={geom.id} selected={geom.id == leaf.shape[0].geom}>
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
                  />
                )}
              </div>

              <div class="stack">
                <h4>Metadata</h4>

                {renderSelect(
                  "Margin",
                  leaf.shape[0].margin,
                  [
                    { value: "entire", label: "Entire" },
                    { value: "serrate", label: "Serrate" },
                    { value: "dentate", label: "Dentate" },
                    { value: "crenate", label: "Crenate" },
                  ],
                  (val) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = { ...shape[0], margin: val as LeafMargin };
                      return { shape };
                    }),
                )}

                {renderSelect(
                  "Venation",
                  leaf.shape[0].venation,
                  [
                    { value: "pinnate", label: "Pinnate" },
                    { value: "palmate", label: "Palmate" },
                    { value: "parallel", label: "Parallel" },
                  ],
                  (val) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = { ...shape[0], venation: val as LeafVenation };
                      return { shape };
                    }),
                )}

                {renderSelect(
                  "Folding",
                  leaf.shape[0].folding,
                  [
                    { value: "none", label: "Flat" },
                    { value: "conduplicate", label: "Conduplicate" },
                    { value: "plicate", label: "Plicate" },
                  ],
                  (val) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = { ...shape[0], folding: val as LeafFolding };
                      return { shape };
                    }),
                )}
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
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* viewwport */}
          <main class="preview-container">
            {isChanged && (
              <div class="preview-badge">
                <strong>{"Unsaved changes"}</strong> — <button onClick={() => save()}>Save</button>
              </div>
            )}
            <Preview leaf={leaf} width={"100%"} height={"100%"} controls={true} showAxis={true} />
          </main>
        </div>
      )}
    </div>
  );
}
