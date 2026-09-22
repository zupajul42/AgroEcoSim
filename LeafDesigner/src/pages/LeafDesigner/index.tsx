import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import {
  Leaf,
  LeafArrangement,
  LeafGeometry,
  LeafInstance,
  LeafLayout,
  LeafLayoutType,
  LeafShape,
} from "../../types/leaf";
import { generateMesh, geometryTriangleCount, meshToObjString, Preview } from "../../components/designer/Preview";
import { state } from "../AppState";
import { historyKey, useHistory } from "../../hooks/useHistory";
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
import { DEFAULT_COLOR_RAMP, sampleColorRamp } from "../../utils/colorRamp";
import { toExportableLeaf } from "../../utils/leafConfigIO";
import { downloadFile } from "../../utils/download";
import { SliderInput } from "../../components/common/SliderInput";
import { DoubleRangeSlider } from "../../components/common/DoubleRangeSlider";
import { ColorRamp } from "../../components/common/ColorRamp";
import "./style.css";

const DEFAULT_COMPOUND_INSTANCES: LeafInstance[] = Array.from({ length: 5 }, () => ({ shape: 0, scale: 1 }));
const DEFAULT_COMPOUND_LAYOUT: LeafLayout = {
  type: "palmate",
  arrangement: "opposite",
  terminalLeaf: true,
  angle: 140,
};

/** Sidebar with all leaf parameters next to a live 3D preview; edits save to the library. */
export function LeafDesigner(props: { leaf?: Leaf }) {
  const location = useLocation();
  const startLeaf = props?.leaf ?? state.leafs.selected() ?? null;

  const [isEdit, setIsEdit] = useState(!!state.leafs.selected());
  const history = useHistory<Leaf>(startLeaf);
  const leaf = history.state;
  const setLeaf = history.set;
  const [leafGeom, setLeafGeom] = useState<LeafGeometry>();
  const [leafGeometries, setLeafGeometries] = useState<LeafGeometry[]>([]);
  const [isCompound, setIsCompound] = useState(startLeaf?.instances?.length > 1);
  const [isChanged, setChanged] = useState(false);
  const [activeLod, setActiveLod] = useState(() => pickMostDetailedLod(startLeaf?.shape?.[0]?.geom, state.geoms.all()));
  const [previewLifetime, setPreviewLifetime] = useState(50);
  const [wireframe, setWireframe] = useState(false);
  const [flatShading, setFlatShading] = useState(false);
  const [lightAngle, setLightAngle] = useState(45);
  const [meshStats, setMeshStats] = useState({ verts: 0, tris: 0 });
  const isInitialLoad = useRef(true);

  // Compound settings survive a switch to "simple" and back.
  const savedCompoundInstances = useRef<LeafInstance[]>(
    startLeaf?.instances?.length > 1 ? startLeaf.instances : DEFAULT_COMPOUND_INSTANCES,
  );
  const savedCompoundLayout = useRef<LeafLayout>(startLeaf?.layout || DEFAULT_COMPOUND_LAYOUT);

  useEffect(() => {
    setTimeout(() => (isInitialLoad.current = false), 100);
    const geoms = state.geoms.all();
    setLeafGeometries(geoms);
    if (leaf) return;

    const selected = state.leafs.selected() ?? state.leafs.all()[0];
    if (!selected) return;
    if (!state.leafs.selected()) state.leafs.select(0);
    setLeaf(selected);
    setActiveLod(pickMostDetailedLod(selected.shape?.[0]?.geom, geoms));
  }, []);

  useEffect(() => {
    if (!leaf?.shape?.[0]) return;
    const geoms = state.geoms.all();
    const activeGeomId = resolveLodGeom(leaf.shape[0].geom, activeLod);
    setLeafGeom(geoms.find((g) => g.id === activeGeomId) ?? geoms[0]);
  }, [leaf, activeLod]);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code === "KeyS" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        save();
        return;
      }
      const key = historyKey(ev);
      if (!key) return;
      ev.preventDefault();
      key === "undo" ? undo() : redo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [leaf, isEdit]);

  useEffect(() => {
    if (isChanged) save();
  }, [leaf, isChanged]);

  const save = () => {
    if (isEdit) state.leafs.updateSelected(leaf);
    else {
      state.leafs.select(state.leafs.add(leaf));
      setLeaf(state.leafs.selected());
      setIsEdit(true);
    }
    setChanged(false);
  };

  const undo = () => {
    history.undo();
    setChanged(true);
  };
  const redo = () => {
    history.redo();
    setChanged(true);
  };

  const updateLeaf = (updater: (prev: Leaf) => Partial<Leaf>) => {
    if (!isInitialLoad.current) setChanged(true);
    setLeaf((prev) => ({ ...prev, ...updater(prev) }));
  };
  const updateShape = (patch: (shape: LeafShape) => Partial<LeafShape>) =>
    updateLeaf((prev) => ({ shape: [{ ...prev.shape[0], ...patch(prev.shape[0]) }, ...prev.shape.slice(1)] }));
  const updateLayout = (patch: Partial<LeafLayout>) => updateLeaf((prev) => ({ layout: { ...prev.layout, ...patch } }));

  const setCompound = (compound: boolean) => {
    setIsCompound(compound);
    if (compound) {
      updateLeaf(() => ({ instances: savedCompoundInstances.current, layout: savedCompoundLayout.current }));
    } else {
      if (leaf.instances.length > 1) savedCompoundInstances.current = leaf.instances;
      if (leaf.layout) savedCompoundLayout.current = leaf.layout;
      updateLeaf((prev) => ({ instances: [{ shape: 0, scale: prev.instances[0]?.scale || 1 }] }));
    }
  };

  const updateInstances = (action: "add" | "remove" | "scaleOffset", index = 0, value = 0) => {
    updateLeaf((prev) => {
      let instances = [...prev.instances];
      // New instances join the shared scale range everyone else uses.
      if (action === "add") instances.push({ shape: 0, scale: instances[0]?.scale ?? 1, scaleOffset: 0 });
      if (action === "remove" && instances.length > 1) instances = instances.filter((_, i) => i !== index);
      if (action === "scaleOffset") instances[index] = { ...instances[index], scaleOffset: value };
      return { instances };
    });
  };

  const selectGeom = (id: string) => {
    if (id === "def:__new") return createGeom();
    const geom = state.geoms.get(id);
    if (!geom) return;
    setLeafGeom(geom);
    updateShape((s) => ({ geom: withLodGeom(s.geom, activeLod, geom.id) }));
  };

  const exportMesh = () =>
    downloadFile(leaf.name + ".obj", meshToObjString(generateMesh(leaf, activeLod), leaf.name), "text/plain");
  const exportConfig = () => downloadFile(leaf.name + ".json", JSON.stringify(toExportableLeaf(leaf), null, 2));
  const reroll = () => updateLeaf(() => ({ randomSeed: rerollSeed() }));

  const addLod = () => {
    const { geom, index } = addLodGeom(leaf.shape[0].geom, resolveLodGeom(leaf.shape[0].geom, activeLod));
    updateShape(() => ({ geom }));
    setActiveLod(index);
  };

  const deleteLod = () => {
    if (getLodCount(leaf.shape[0].geom) <= 1 || !confirm(`Delete LOD ${activeLod}?`)) return;
    updateShape((s) => ({
      geom: removeLodGeom(s.geom, activeLod),
      scaleX: removeLodScale(s.scaleX, activeLod),
      scaleY: removeLodScale(s.scaleY, activeLod),
    }));
    setActiveLod((prev) => Math.min(prev, getLodCount(leaf.shape[0].geom) - 2));
  };

  const editGeom = () => {
    if (leafGeom) location.route("/leaf/geometry/" + leafGeom.id);
  };

  // Creates (or copies) a geometry, assigns it to the active LOD and opens it in the editor.
  const createGeom = (start?: LeafGeometry) => {
    const geom = start ? state.geoms.duplicate(start) : state.geoms.createDefault();
    setLeafGeometries(state.geoms.all());
    setLeafGeom(geom);
    updateLeaf((prev) => {
      const updated = {
        ...prev,
        shape: [{ ...prev.shape[0], geom: withLodGeom(prev.shape[0].geom, activeLod, geom.id) }],
      };
      state.leafs.updateSelected(updated);
      return updated;
    });
    location.route("/leaf/geometry/" + geom.id);
  };

  const createLeaf = () => {
    const created = state.leafs.createDefault();
    state.leafs.select(state.leafs.add(created));
    setLeaf(created);
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

  const stemSliders = (type: "petiolule" | "petiole") => {
    const isPetiolule = type === "petiolule";
    const target = isPetiolule ? leaf.shape[0]?.petiolule : leaf.petiole;
    const fields = [
      // The petiole runs on a log scale (1 cm..3 m long, 5 mm..1 m wide), so centimetre stems are as easy to set as metre ones.
      {
        label: "Length",
        field: "len",
        min: isPetiolule ? 0 : 0.01,
        max: isPetiolule ? 5 : 3,
        step: isPetiolule ? 0.1 : 0.005,
        unit: "m",
        value: target?.len || 0,
        defaultValue: isPetiolule ? 0 : 1.5,
        log: !isPetiolule,
      },
      {
        label: "Width",
        field: "width",
        min: isPetiolule ? 0.05 : 0.005,
        max: 1,
        step: isPetiolule ? 0.05 : 0.005,
        unit: "m",
        value: target?.width || 0.1,
        defaultValue: isPetiolule ? 0.1 : 0.05,
        log: !isPetiolule,
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
        log: false,
      },
    ] as const;
    return fields.map((f) => (
      <SliderInput
        key={f.label}
        label={f.label}
        min={f.min}
        max={f.max}
        step={f.step}
        unit={f.unit}
        value={f.value}
        defaultValue={f.defaultValue}
        log={f.log}
        onInput={(val) =>
          isPetiolule
            ? updateShape((s) => ({ petiolule: { ...s.petiolule, [f.field]: val } }))
            : updateLeaf((prev) => ({ petiole: { ...prev.petiole, [f.field]: val } }))
        }
      />
    ));
  };

  const angleSlider = (label: string, min: number, max: number, step: number, fallback: number) => (
    <DoubleRangeSlider
      label={label}
      min={min}
      max={max}
      step={step}
      unit="°"
      valueMin={toRange(leaf.layout?.angle, fallback).min}
      valueMax={toRange(leaf.layout?.angle, fallback).max}
      onChange={(lo, hi) => updateLayout({ angle: { min: lo, max: hi } })}
      defaultMin={fallback}
      defaultMax={fallback}
    />
  );

  if (!leaf) {
    return (
      <div class="page-notice" style={{ textAlign: "center" }}>
        <h2>No Leaf Loaded</h2>
        <p>You can create a new leaf or load one from your library.</p>
        <button onClick={createLeaf}>Create New Leaf</button>
      </div>
    );
  }

  const lodCount = getLodCount(leaf.shape[0].geom);

  return (
    <div class="designer-layout">
      <aside class="config-sidebar stack">
        <div class="stack">
          <div class="row">
            <h2>Leaf Designer</h2>
            <button onClick={() => location.route("/")}>Back to Library</button>
          </div>
          <div class="btn-group">
            <button onClick={undo} disabled={!history.canUndo} title="Undo (Ctrl+Z / Cmd+Z)">
              Undo
            </button>
            <button onClick={redo} disabled={!history.canRedo} title="Redo (Ctrl+Y / Cmd+Shift+Z)">
              Redo
            </button>
            <button onClick={exportMesh}>Export Mesh</button>
            <button onClick={exportConfig}>Export Config</button>
            <button onClick={reroll} title="Pick new values for every pseudorandom range on this leaf">
              Reroll
            </button>
          </div>
        </div>

        <div class="stack">
          <input
            type="text"
            class="full-width"
            value={leaf.name}
            onInput={(e) => updateLeaf(() => ({ name: e.currentTarget.value }))}
            placeholder="Leaf Name"
          />
          <div class="btn-group">
            <label class="label-row">
              <input type="radio" name="type" checked={!isCompound} onChange={() => setCompound(false)} />
              <span>Simple Leaf</span>
            </label>
            <label class="label-row">
              <input type="radio" name="type" checked={isCompound} onChange={() => setCompound(true)} />
              <span>Compound Leaf</span>
            </label>
          </div>
        </div>

        {isCompound && (
          <div class="stack loose">
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
                (val) => updateLayout({ type: val as LeafLayoutType, angle: val === "pinnate" ? 60 : 140 }),
              )}
              {leaf.layout?.type === "pinnate" ? (
                <>
                  {renderSelect(
                    "Arrangement",
                    leaf.layout?.arrangement,
                    [
                      { value: "opposite", label: "Opposite" },
                      { value: "alternate", label: "Alternate" },
                    ],
                    (val) => updateLayout({ arrangement: val as LeafArrangement }),
                  )}
                  {angleSlider("Branch Angle", 5, 90, 1, 60)}
                  <SliderInput
                    label="Leaflet Distribution"
                    min={0.05}
                    max={1}
                    step={0.05}
                    unit="x"
                    value={leaf.layout?.distributionCurve || 1}
                    onInput={(val) => updateLayout({ distributionCurve: val })}
                    defaultValue={1}
                  />
                  <label class="label-row">
                    <input
                      type="checkbox"
                      checked={leaf.layout?.terminalLeaf}
                      onChange={(e) => updateLayout({ terminalLeaf: e.currentTarget.checked })}
                    />
                    <span>Terminal Leaf</span>
                  </label>
                </>
              ) : (
                angleSlider("Fanning Angle", 0, 360, 5, 140)
              )}
            </div>

            <div class="stack">
              <div class="row">
                <h4>Instances ({leaf.instances.length})</h4>
                <button onClick={() => updateInstances("add")}>+ Add</button>
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
              {/* Each instance adds its own offset to the rolled shared size */}
              <div class="instances-list stack">
                {leaf.instances.map((instance, index) => {
                  const resolved =
                    resolveRandomValue(instance.scale, leaf.randomSeed ?? 0, "instanceScale", index, 1) +
                    (instance.scaleOffset ?? 0);
                  return (
                    <div key={index} class="row">
                      <SliderInput
                        label={`#${index + 1}`}
                        min={-1}
                        max={1}
                        step={0.05}
                        unit="x"
                        value={instance.scaleOffset ?? 0}
                        onInput={(val) => updateInstances("scaleOffset", index, val)}
                        defaultValue={0}
                        inline
                        style={{ flex: "1" }}
                      />
                      <span title="Rolled + offset">= {resolved.toFixed(2)}x</span>
                      {leaf.instances.length > 1 && (
                        <button onClick={() => updateInstances("remove", index)} title="Remove instance">
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

        <div class="stack loose">
          <h3>{isCompound ? "Leaflet" : "Leaf"}</h3>
          <div class="stack">
            <h4>Geometry (LOD {activeLod})</h4>
            <div class="row">
              <select
                class="full-width"
                value={resolveLodGeom(leaf.shape[0].geom, activeLod)}
                onChange={(e) => selectGeom(e.currentTarget.value)}
              >
                {leafGeometries.map((geom) => (
                  <option key={geom.id} value={geom.id}>
                    {geom.name} ({geometryTriangleCount(geom.id)} tris)
                  </option>
                ))}
                <option value="def:__new">New</option>
              </select>
              {leafGeom ? (
                <>
                  <button onClick={editGeom}>Edit</button>
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
                onChange={(lo, hi) => updateLeaf(() => ({ instances: [{ shape: 0, scale: { min: lo, max: hi } }] }))}
                defaultMin={1}
                defaultMax={1}
              />
            )}
            {(["scaleX", "scaleY"] as const).map((axis) => (
              <DoubleRangeSlider
                key={axis}
                label={axis === "scaleX" ? "Blade Scale X" : "Blade Scale Y"}
                min={0.2}
                max={3.0}
                step={0.05}
                unit="x"
                valueMin={toRange(resolveLodScale(leaf.shape[0][axis], activeLod), 1).min}
                valueMax={toRange(resolveLodScale(leaf.shape[0][axis], activeLod), 1).max}
                onChange={(lo, hi) =>
                  updateShape((s) => ({ [axis]: withLodScale(s[axis], activeLod, { min: lo, max: hi }) }))
                }
                defaultMin={1}
                defaultMax={1}
              />
            ))}
          </div>
        </div>

        <div class="stack loose">
          <h3>{isCompound ? "Petiole & Stems" : "Petiole & Stem"}</h3>
          {isCompound && (
            <div class="stack">
              <h4>Leaflet Stem (Petiolule)</h4>
              {stemSliders("petiolule")}
            </div>
          )}
          <div class="stack">
            <h4>Main Stem (Petiole)</h4>
            {stemSliders("petiole")}
          </div>
        </div>

        <div class="stack loose">
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

      <main class="preview-container">
        <div class="preview-overlay-top-left">
          <div
            class="seg-group"
            title="Level of detail previewed — the Geometry select edits this LOD's geometry. Hover the active one to delete it."
          >
            {Array.from({ length: lodCount }, (_, level) => {
              const isActive = activeLod === level;
              const canDelete = isActive && lodCount > 1;
              return (
                <button
                  key={level}
                  class={`seg-btn ${isActive ? "active" : ""} ${canDelete ? "deletable" : ""}`}
                  onClick={() => (canDelete ? deleteLod() : setActiveLod(level))}
                  title={canDelete ? `Delete LOD ${level}` : `Level of detail ${level}`}
                >
                  <span class="lod-num">{level}</span>
                  <span class="lod-dash">−</span>
                </button>
              );
            })}
            <button class="seg-btn" onClick={addLod} title="Add a new LOD">
              +
            </button>
          </div>
        </div>
        <div class="preview-overlay-top-right">
          <span>{meshStats.verts} verts</span>
          <span>{meshStats.tris} triangles</span>
        </div>
        <div class="preview-overlay-bottom-right">
          <label class="label-row">
            <input type="checkbox" checked={wireframe} onChange={(e) => setWireframe(e.currentTarget.checked)} />
            <span>Wireframe</span>
          </label>
          <label class="label-row">
            <input type="checkbox" checked={flatShading} onChange={(e) => setFlatShading(e.currentTarget.checked)} />
            <span>Flat Shading</span>
          </label>
          <SliderInput
            label="Light"
            min={0}
            max={360}
            step={1}
            unit="°"
            value={lightAngle}
            onInput={setLightAngle}
            inline
          />
        </div>
        <Preview
          leaf={leaf}
          controls
          showAxis
          lod={activeLod}
          color={sampleColorRamp(leaf.colorRamp, previewLifetime / 100)}
          wireframe={wireframe}
          flatShading={flatShading}
          lightAngle={lightAngle}
          onMesh={(mesh) => setMeshStats({ verts: mesh.position.length / 3, tris: mesh.index.length / 3 })}
        />
      </main>
    </div>
  );
}
