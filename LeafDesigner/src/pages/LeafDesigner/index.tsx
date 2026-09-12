import { useEffect, useRef, useState } from "preact/hooks";
import { Leaf, LeafArrangement, LeafGeometry, LeafInstance, LeafLayout, LeafLayoutType } from "../../types/leaf";
import { generateMesh, geometryTriangleCount, meshToObjString, Preview } from "../../components/designer/Preview";
import "./style.css";
import { state } from "../AppState";
import { useInsertionEffect } from "preact/compat";
import {
  addLodGeom,
  getLodCount,
  pickMostDetailedLod,
  removeLodGeom,
  removeLodScale,
  resolveLodGeom,
  resolveLodScale,
  withLodGeom,
  withLodScale,
} from "../../utils/lod";
import { resolveRandomValue, rerollSeed, toRange } from "../../utils/random";

import { useLocation } from "preact-iso";
import { useHistory } from "../../hooks/useHistory";
import { SliderInput } from "../../components/common/SliderInput";
import { DoubleRangeSlider } from "../../components/common/DoubleRangeSlider";
import { ColorRamp } from "../../components/common/ColorRamp";
import { DEFAULT_COLOR_RAMP, sampleColorRamp } from "../../utils/colorRamp";
import { toExportableLeaf } from "../../utils/leafConfigIO";

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

  const { state: leaf, set: setLeaf, undo, redo, canUndo, canRedo } = useHistory<Leaf>(startLeaf);
  const [leafGeom, setLeafGeom] = useState<LeafGeometry>();
  const [leafGeometries, setLeafGeometries] = useState<LeafGeometry[]>([]);
  const [isCompound, setIsCompound] = useState<boolean>(startLeaf?.instances?.length > 1);
  const [isChanged, setChanged] = useState<boolean>(false);
  const [activeLod, setActiveLod] = useState<number>(() => pickMostDetailedLod(startLeaf?.shape?.[0]?.geom, state.geoms.all()));
  const [previewLifetime, setPreviewLifetime] = useState<number>(50);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [flatShading, setFlatShading] = useState<boolean>(false);
  const [lightAngle, setLightAngle] = useState<number>(45);
  const [meshStats, setMeshStats] = useState<{ verts: number; tris: number }>({ verts: 0, tris: 0 });
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
        ],
  );

  const savedCompoundLayout = useRef<LeafLayout>(
    startLeaf?.layout || {
      type: "palmate",
      arrangement: "opposite",
      terminalLeaf: true,
      angle: 140,
    },
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
      const selected = state.leafs.selected();
      if (selected) {
        setLeaf(selected);
        setActiveLod(pickMostDetailedLod(selected.shape?.[0]?.geom, geoms));
      } else {
        const allLeafs = state.leafs.all();
        if (allLeafs.length > 0) {
          state.leafs.select(0);
          setLeaf(allLeafs[0]);
          setActiveLod(pickMostDetailedLod(allLeafs[0].shape?.[0]?.geom, geoms));
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

  const handleInstance = (action: "add" | "remove" | "scale" | "scaleOffset", index?: number, value?: number) => {
    updateLeaf((prev) => {
      let instances = [...prev.instances];
      // New instances join the same shared scale range everyone else uses.
      if (action === "add") instances.push({ shape: 0, scale: instances[0]?.scale ?? 1, scaleOffset: 0 });
      if (action === "remove" && instances.length > 1 && index !== undefined) {
        instances = instances.filter((_, i) => i !== index);
      }
      if (action === "scale" && index !== undefined && value !== undefined) {
        instances[index] = { ...instances[index], scale: value };
      }
      if (action === "scaleOffset" && index !== undefined && value !== undefined) {
        instances[index] = { ...instances[index], scaleOffset: value };
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
    // use current LOD for .obj export
    const objStr = meshToObjString(generateMesh(leaf, activeLod), leaf.name);
    const blob = new Blob([objStr], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = leaf.name + ".obj";
    a.href = URL.createObjectURL(blob);
    a.click();
    a.remove();
  };
  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(toExportableLeaf(leaf), null, 2)], { type: "application/json" });
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
    if (!confirm(`Delete LOD ${removedIndex}?`)) return;
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

  const handleReroll = () => updateLeaf(() => ({ randomSeed: rerollSeed() }));

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
        min: 0,
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
                <button onClick={handleReroll} title="Pick new values for every pseudorandom range on this leaf">
                  Reroll
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

                  {leaf.layout?.type === "pinnate" &&
                    renderSelect(
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
                    <DoubleRangeSlider
                      label="Branch Angle"
                      min={5}
                      max={90}
                      step={1}
                      unit="°"
                      valueMin={toRange(leaf.layout?.angle, 60).min}
                      valueMax={toRange(leaf.layout?.angle, 60).max}
                      onChange={(lo, hi) =>
                        updateLeaf((prev) => ({ layout: { ...prev.layout, angle: { min: lo, max: hi } } }))
                      }
                      defaultMin={60}
                      defaultMax={60}
                    />
                  ) : (
                    <DoubleRangeSlider
                      label="Fanning Angle"
                      min={0}
                      max={360}
                      step={5}
                      unit="°"
                      valueMin={toRange(leaf.layout?.angle, 140).min}
                      valueMax={toRange(leaf.layout?.angle, 140).max}
                      onChange={(lo, hi) =>
                        updateLeaf((prev) => ({ layout: { ...prev.layout, angle: { min: lo, max: hi } } }))
                      }
                      defaultMin={140}
                      defaultMax={140}
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
                      onInput={(val) => updateLeaf((prev) => ({ layout: { ...prev.layout, distributionCurve: val } }))}
                      defaultValue={1}
                    />
                  )}

                  {leaf.layout?.type === "pinnate" && (
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
                  )}
                </div>

                <div class="stack">
                  <div class="row">
                    <h4>Instances ({leaf.instances.length})</h4>
                    <button onClick={() => handleInstance("add")}>+ Add</button>
                  </div>

                  <DoubleRangeSlider
                    label="Instance Size"
                    min={0.1}
                    max={3.0}
                    step={0.05}
                    unit="x"
                    valueMin={toRange(leaf.instances[0]?.scale, 1).min}
                    valueMax={toRange(leaf.instances[0]?.scale, 1).max}
                    defaultMin={1}
                    defaultMax={1}
                    onChange={(lo, hi) =>
                      updateLeaf((prev) => ({
                        instances: prev.instances.map((inst) => ({ ...inst, scale: { min: lo, max: hi } })),
                      }))
                    }
                  />

                  {/* Each instance can have its own randomized scale */}
                  <div class="instances-list stack">
                    {leaf.instances.map((instance, index) => {
                      const resolved =
                        resolveRandomValue(instance.scale, leaf.randomSeed ?? 0, "instanceScale", index, 1) +
                        (instance.scaleOffset ?? 0);
                      return (
                        <div key={index} class="row" style={{ alignItems: "center" }}>
                          <SliderInput
                            label={`#${index + 1}`}
                            min={-1}
                            max={1}
                            step={0.05}
                            unit="x"
                            value={instance.scaleOffset ?? 0}
                            onInput={(val) => handleInstance("scaleOffset", index, val)}
                            defaultValue={0}
                            inline={true}
                            style={{ flex: "1" }}
                          />
                          <span title="Rolled + offset">= {resolved.toFixed(2)}x</span>
                          {leaf.instances.length > 1 && (
                            <button onClick={() => handleInstance("remove", index)} title="Remove instance">
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                        {geom.name} ({geometryTriangleCount(geom.id)} tris)
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
                  <DoubleRangeSlider
                    label="Leaf Scale"
                    min={0.1}
                    max={5.0}
                    step={0.05}
                    unit="x"
                    valueMin={toRange(leaf.instances[0]?.scale, 1).min}
                    valueMax={toRange(leaf.instances[0]?.scale, 1).max}
                    onChange={(lo, hi) =>
                      updateLeaf((prev) => ({
                        instances: [{ shape: 0, scale: { min: lo, max: hi } }],
                      }))
                    }
                    defaultMin={1}
                    defaultMax={1}
                  />
                )}

                <DoubleRangeSlider
                  label="Blade Scale X"
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  unit="x"
                  valueMin={toRange(resolveLodScale(leaf.shape[0].scaleX, activeLod), 1).min}
                  valueMax={toRange(resolveLodScale(leaf.shape[0].scaleX, activeLod), 1).max}
                  onChange={(lo, hi) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = {
                        ...shape[0],
                        scaleX: withLodScale(shape[0].scaleX, activeLod, { min: lo, max: hi }),
                      };
                      return { shape };
                    })
                  }
                  defaultMin={1}
                  defaultMax={1}
                />
                <DoubleRangeSlider
                  label="Blade Scale Y"
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  unit="x"
                  valueMin={toRange(resolveLodScale(leaf.shape[0].scaleY, activeLod), 1).min}
                  valueMax={toRange(resolveLodScale(leaf.shape[0].scaleY, activeLod), 1).max}
                  onChange={(lo, hi) =>
                    updateLeaf((prev) => {
                      const shape = [...prev.shape];
                      shape[0] = {
                        ...shape[0],
                        scaleY: withLodScale(shape[0].scaleY, activeLod, { min: lo, max: hi }),
                      };
                      return { shape };
                    })
                  }
                  defaultMin={1}
                  defaultMax={1}
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

            {/* color over the leaf's lifetime */}
            <div class="stack" style={{ gap: "14px" }}>
              <h3>Color</h3>
              <div class="stack">
                <ColorRamp
                  stops={leaf.colorRamp?.length ? leaf.colorRamp : DEFAULT_COLOR_RAMP}
                  onChange={(stops) => updateLeaf(() => ({ colorRamp: stops }))}
                />
                <SliderInput
                  label="Preview Lifetime"
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  value={previewLifetime}
                  onInput={setPreviewLifetime}
                  defaultValue={50}
                />
              </div>
            </div>
          </aside>

          {/* viewwport */}
          <main class="preview-container">
            <div class="preview-overlay-top-left">
              <div
                class="lod-switcher"
                title="Level of detail previewed — the Geometry select edits this LOD's geometry. Hover the active one to delete it."
              >
                {Array.from({ length: getLodCount(leaf.shape[0].geom) }, (_, level) => {
                  const isActive = activeLod === level;
                  const canDelete = isActive && getLodCount(leaf.shape[0].geom) > 1;
                  return (
                    <button
                      key={level}
                      class={`lod-btn ${isActive ? "active" : ""} ${canDelete ? "deletable" : ""}`}
                      onClick={() => {
                        if (canDelete) handleDeleteLod();
                        else if (!isActive) setActiveLod(level);
                      }}
                      title={canDelete ? `Delete LOD ${level}` : `Level of detail ${level}`}
                    >
                      <span class="lod-num">{level}</span>
                      <span class="lod-dash">−</span>
                    </button>
                  );
                })}
                <button class="lod-btn" onClick={handleAddLod} title="Add a new LOD">
                  +
                </button>
              </div>
            </div>
            <div class="preview-overlay-top-right">
              <span>{meshStats.verts} verts</span>
              <span>{meshStats.tris} triangles</span>
            </div>
            <div class="preview-overlay-bottom-right">
              <label class="row" style={{ justifyContent: "flex-start", gap: "6px" }}>
                <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.currentTarget.checked)} />
                <span>Wireframe</span>
              </label>
              <label class="row" style={{ justifyContent: "flex-start", gap: "6px" }}>
                <input
                  type="checkbox"
                  checked={flatShading}
                  onChange={(e) => setFlatShading(e.currentTarget.checked)}
                />
                <span>Flat Shading</span>
              </label>
              <label class="row" style={{ justifyContent: "flex-start", gap: "6px" }}>
                <span>Light</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={lightAngle}
                  onInput={(e) => setLightAngle(parseFloat(e.currentTarget.value))}
                />
                <input
                  type="number"
                  min={0}
                  max={360}
                  step={1}
                  value={lightAngle}
                  onInput={(e) => {
                    const val = parseFloat(e.currentTarget.value);
                    if (!isNaN(val)) setLightAngle(val);
                  }}
                />
                <span>°</span>
              </label>
            </div>
            <Preview
              leaf={leaf}
              width={"100%"}
              height={"100%"}
              controls={true}
              showAxis={true}
              lod={activeLod}
              color={sampleColorRamp(leaf.colorRamp, previewLifetime / 100)}
              wireframe={wireframe}
              flatShading={flatShading}
              lightAngle={lightAngle}
              meshCallback={(mesh) => {
                setMeshStats({ verts: mesh.position.length / 3, tris: mesh.index.length / 3 });
                return {};
              }}
            />
          </main>
        </div>
      )}
    </div>
  );
}
