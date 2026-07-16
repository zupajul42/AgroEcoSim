import { useEffect, useRef, useState } from "preact/hooks";
import {
  Leaf,
  LeafArrangement,
  LeafFolding,
  LeafGeometry,
  LeafLayoutType,
  LeafMargin,
  LeafVenation,
} from "../../types/leaf";
import { Preview } from "../../components/designer/Preview";
import "./style.css";
import { state } from "../AppState";
import { useInsertionEffect } from "preact/compat";

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
  const startLeaf = props?.leaf ?? state.leafs.selected() ?? null;

  const [isEdit, setIsEdit] = useState<boolean>(!!state.leafs.selected());

  const [leaf, setLeaf] = useState<Leaf>(startLeaf);
  const [leafGeom, setLeafGeom] = useState<LeafGeometry>();
  const [leafGeometries, setLeafGeometries] = useState<LeafGeometry[]>([]);
  const [isCompound, setIsCompound] = useState<boolean>(startLeaf?.instances?.length > 1);
  const [isChanged, setChanged] = useState<boolean>(false);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    setTimeout(() => (isInitialLoad.current = false), 100);
    setLeafGeometries(state.geoms.all());
  }, []);

  useEffect(() => {
    const onKeydown = (ev: KeyboardEvent) => {
      if (ev.code == "KeyS" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        save();
      }
    };

    if (leaf) {
      const geoms = state.geoms.all();
      const current = geoms.find((g) => g.id == leaf.shape[0].geom);
      if (!current) {
        alert("Unknown leaf geometry: " + leaf.shape[0].geom);
        throw "Unknown leaf geometry: " + leaf.shape[0].geom;
      }
      setLeafGeom(current);
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

  const handleExportMesh = () => alert("Exporting Mesh (OBJ/GLTF)...");
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

  const renderSlider = ({ label, min, max, step, unit, value, onInput }: SliderProp) => (
    <div class="stack" key={label}>
      <div class="row">
        <label>{label}</label>
        <span>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        class="full-width"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(parseFloat(e.currentTarget.value))}
      />
    </div>
  );

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
    const target = isPetiolule ? leaf.shape[0].petiolule : leaf.petiole;

    return [
      {
        label: "Length",
        field: "len",
        min: isPetiolule ? 0 : 0.5,
        max: isPetiolule ? 5 : 10,
        step: 0.1,
        unit: "m",
        value: target.len,
      },
      {
        label: "Width",
        field: "width",
        min: 0.05,
        max: isPetiolule ? 1 : 1.5,
        step: 0.05,
        unit: "m",
        value: target.width,
      },
      { label: "Angle", field: "angle", min: -90, max: 90, step: 1, unit: "°", value: target.angle },
    ];
  };

  return (
    <div>
      {!leaf && (
        <div>
          <h2>Landed here without UI?</h2>
          <button>Create new leaf</button>
        </div>
      )}
      {!!leaf && (
        <div class="designer-layout">
          <aside class="config-sidebar stack" style={{ gap: "24px" }}>
            {/* nav, title, export  */}
            <div class="stack" style={{ gap: "8px" }}>
              <a href="/" class="back-link">
                ← Back to Overview
              </a>
              <h2>Leaf Designer</h2>
              <div class="btn-group">
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
                  <input type="radio" name="type" checked={!isCompound} onChange={() => setIsCompound(false)} />
                  <span>Simple Leaf</span>
                </label>
                <label class="row">
                  <input type="radio" name="type" checked={isCompound} onChange={() => setIsCompound(true)} />
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

                  {renderSlider({
                    label: "Fanning Angle",
                    min: 0,
                    max: 360,
                    step: 5,
                    unit: "°",
                    value: leaf.layout?.angle,
                    onInput: (val) => updateLeaf((prev) => ({ layout: { ...prev.layout, angle: val } })),
                  })}

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
                      <div key={index} class="row">
                        <span>#{index + 1}</span>
                        <input
                          type="range"
                          class="flex-grow"
                          min="0.1"
                          max="3.0"
                          step="0.05"
                          value={instance.scale}
                          onInput={(e) => handleInstance("scale", index, parseFloat(e.currentTarget.value))}
                        />
                        <span>{instance.scale.toFixed(2)}x</span>
                        {leaf.instances.length > 1 && (
                          <button onClick={() => handleInstance("remove", index)}>✕</button>
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
                  <select class="full-width">
                    {leafGeometries.map((geom) => (
                      <option value={geom.name} selected={geom.id == leaf.shape[0].geom}>
                        {geom.name} ({geom.points.length} Pts)
                      </option>
                    ))}
                    <option value="new">New</option>
                  </select>
                  {leafGeom ? (
                    <>
                      <button onClick={() => alert("Open Vector Grid Editor")}>Edit</button>
                      <button onClick={() => alert("Open Vector Grid Editor")}>Copy and Edit</button>
                    </>
                  ) : (
                    <button onClick={() => alert("Open Vector Grid Editor")}>Create New</button>
                  )}
                </div>
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
                  {stemSliderConfig("petiolule").map((p) =>
                    renderSlider({
                      label: p.label,
                      min: p.min,
                      max: p.max,
                      step: p.step,
                      unit: p.unit,
                      value: p.value,
                      onInput: (val) =>
                        updateLeaf((prev) => {
                          const shape = [...prev.shape];
                          shape[0] = { ...shape[0], petiolule: { ...shape[0].petiolule, [p.field]: val } };
                          return { shape };
                        }),
                    }),
                  )}
                </div>
              )}

              {/* main stem (petiole) */}
              <div class="stack">
                <h4>Main Stem (Petiole)</h4>
                {stemSliderConfig("petiole").map((s) =>
                  renderSlider({
                    label: s.label,
                    min: s.min,
                    max: s.max,
                    step: s.step,
                    unit: s.unit,
                    value: s.value,
                    onInput: (val) => updateLeaf((prev) => ({ petiole: { ...prev.petiole, [s.field]: val } })),
                  }),
                )}
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
