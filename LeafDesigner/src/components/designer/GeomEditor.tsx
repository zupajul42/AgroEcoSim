import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { LeafGeometry, LeafMargin, Point, VeinData, VeinGenParams, VeinNode } from "../../types/leaf";
import { state } from "../../pages/AppState";
import { historyKey, useHistory } from "../../hooks/useHistory";
import {
  generateOutlineFromVeins,
  createVeinNode,
  findVeinNode,
  updateVeinTree,
  addVeinChild,
  removeVeinNode,
  mergeNearbyVeinNode,
  flattenVeinEdges,
  getEffectiveTipParams,
  getEffectiveLateralOffset,
  getEffectiveLobeDepth,
  getEffectiveLobeThreshold,
  MAX_ROTATION_DEG,
  DEFAULT_VEIN_PARAMS,
  ensureVeinData,
} from "../../utils/veinGenerator";
import { applyMarginTeethToOutline } from "../../utils/marginTeeth";
import { SliderInput } from "../common/SliderInput";
import "./GeomEditor.css";

const ZOOM = 140; // screen pixels per leaf unit at zoom 1
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;
const TOUCH_DRAG_THRESHOLD = 4;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** 2D editor for one geometry: the vein tree and the outline generated from it. */
export function GeomEditor({ id }: { id: string }) {
  const location = useLocation();
  const initialGeom = state.geoms.get(id);

  if (!initialGeom) {
    return (
      <div class="geom-viewport page-notice">
        <h2>Geometry Not Found</h2>
        <p>Could not find geometry with ID: {id}</p>
        <button onClick={() => window.history.back()}>Back</button>
      </div>
    );
  }

  if (id.startsWith("def:")) {
    const copyAndEdit = () => location.route("/leaf/geometry/" + state.geoms.duplicate(initialGeom).id);
    return (
      <div class="geom-viewport page-notice">
        <h2>{initialGeom.name}</h2>
        <p>
          This is a built-in geometry, so it can't be edited directly — it needs to stay available exactly as-is for
          every leaf that uses it. Copy it into a new geometry to customize its outline or veins.
        </p>
        <div class="btn-group">
          <button onClick={copyAndEdit}>Copy and Edit</button>
          <button onClick={() => window.history.back()}>Back</button>
        </div>
      </div>
    );
  }

  const { state: geom, set: setGeom, undo, redo, canUndo, canRedo, pushState } = useHistory<LeafGeometry>(initialGeom);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [genParams, setGenParams] = useState<VeinGenParams>({ ...DEFAULT_VEIN_PARAMS, ...initialGeom.veins?.params });
  const [enableSnap, setEnableSnap] = useState(true);
  const [gridSnap, setGridSnap] = useState(0.1);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 600 });
  // Zoom factor and pan offset (screen px, relative to the default centre) of the canvas.
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const viewRef = useRef(view);
  const updateView = (next: typeof view) => {
    viewRef.current = next;
    setView(next);
  };

  // A drag in progress; stays set briefly after release so the click that follows is ignored.
  const dragRef = useRef<{ moved: boolean } | null>(null);

  // Latest values for the window-level mouse handlers, which outlive a render.
  const geomRef = useRef(geom);
  geomRef.current = geom;
  const genParamsRef = useRef(genParams);
  genParamsRef.current = genParams;

  useEffect(() => {
    state.geoms.updateById(geom.id, geom);
  }, [geom]);

  useEffect(() => {
    const resize = () => {
      const el = containerRef.current;
      if (el) setViewSize({ width: el.clientWidth, height: el.clientHeight });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      const history = historyKey(ev);
      if (history) {
        ev.preventDefault();
        history === "undo" ? undo() : redo();
        return;
      }
      const inInput = ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement;
      if (!inInput && (ev.key === "Backspace" || ev.key === "Delete")) removeSelectedNode();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, geom, undo, redo]);

  const viewCenter = (width: number, height: number): Point => ({ x: width / 2, y: height / 2 + 80 });
  const { x: centerX, y: centerY } = viewCenter(viewSize.width, viewSize.height);
  const scale = ZOOM * view.zoom;

  const toScreen = (p: Point): Point => ({
    x: centerX + view.pan.x + p.x * scale,
    y: centerY + view.pan.y - p.y * scale,
  });

  const toLeafCoord = (screenX: number, screenY: number): Point => {
    const rawX = (screenX - centerX - view.pan.x) / scale;
    const rawY = (centerY + view.pan.y - screenY) / scale;
    if (!enableSnap || gridSnap <= 0) return { x: round2(rawX), y: round2(rawY) };
    return { x: Math.round(rawX / gridSnap) * gridSnap, y: Math.round(rawY / gridSnap) * gridSnap };
  };

  const leafCoordAt = (e: MouseEvent | PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return toLeafCoord(e.clientX - rect.left, e.clientY - rect.top);
  };

  // --- ZOOM & PAN ---

  const panBy = (dx: number, dy: number) => {
    const { zoom, pan } = viewRef.current;
    updateView({ zoom, pan: { x: pan.x + dx, y: pan.y + dy } });
  };

  // Zooms by `factor` so that the leaf point under the client position stays where it is.
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const center = viewCenter(rect.width, rect.height);
    const { zoom, pan } = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    const f = nextZoom / zoom;
    const sx = clientX - rect.left - center.x;
    const sy = clientY - rect.top - center.y;
    updateView({ zoom: nextZoom, pan: { x: sx - (sx - pan.x) * f, y: sy - (sy - pan.y) * f } });
  };

  useEffect(() => {
    const svg = canvasRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY;
      zoomAt(e.clientX, e.clientY, Math.exp(-delta * 0.002));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // Fingers currently down on the empty canvas, by pointer id (client coordinates).
  const touchesRef = useRef(new Map<number, Point>());

  // Mouse: shift + drag pans. Touch: one finger pans (a tap still adds a vein), two fingers pinch-zoom and pan.
  const onCanvasPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      if (!e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      let last = { x: e.clientX, y: e.clientY };
      dragUntilRelease((moveEv) => {
        panBy(moveEv.clientX - last.x, moveEv.clientY - last.y);
        last = { x: moveEv.clientX, y: moveEv.clientY };
      });
      return;
    }

    const touches = touchesRef.current;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size > 1) {
      // A second finger turns the gesture into pinch/pan; the trailing click must not add a vein.
      dragRef.current = { moved: true };
      return;
    }

    const onPointerMove = (ev: PointerEvent) => {
      const prev = touches.get(ev.pointerId);
      if (!prev) return;
      const cur = { x: ev.clientX, y: ev.clientY };
      if (touches.size === 1) {
        if (!dragRef.current && Math.hypot(cur.x - prev.x, cur.y - prev.y) < TOUCH_DRAG_THRESHOLD) return;
        dragRef.current = { moved: true };
        panBy(cur.x - prev.x, cur.y - prev.y);
      } else {
        const other = [...touches].find(([id]) => id !== ev.pointerId)![1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
        const d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
        const mid0 = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
        const mid1 = { x: (cur.x + other.x) / 2, y: (cur.y + other.y) / 2 };
        if (d0 > 0) zoomAt(mid0.x, mid0.y, d1 / d0);
        panBy(mid1.x - mid0.x, mid1.y - mid0.y);
      }
      touches.set(ev.pointerId, cur);
    };
    const onPointerUp = (ev: PointerEvent) => {
      touches.delete(ev.pointerId);
      if (touches.size > 0) return;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (dragRef.current) setTimeout(() => (dragRef.current = null), 50);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Tracks the pointer (mouse, touch or pen) until release; the drag flag clears shortly after so the trailing click is ignored.
  const dragUntilRelease = (onMove: (e: PointerEvent) => void, onRelease?: () => void) => {
    dragRef.current = { moved: false };
    const onPointerMove = (e: PointerEvent) => {
      dragRef.current!.moved = true;
      onMove(e);
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      onRelease?.();
      setTimeout(() => (dragRef.current = null), 50);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const displayPoints = useMemo(() => {
    if (!geom.points || geom.points.length < 3) return [];
    if (!geom.margin || geom.margin === "entire") return geom.points;
    return applyMarginTeethToOutline(
      geom.points,
      geom.margin,
      geom.marginToothSize ?? 1,
      geom.marginToothDepth ?? 1,
      geom.veins?.params?.subdivisions,
    );
  }, [geom.points, geom.margin, geom.marginToothSize, geom.marginToothDepth, geom.veins?.params?.subdivisions]);

  const pointsString = useMemo(
    () =>
      displayPoints
        .map((p) => toScreen(p))
        .map((sp) => `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`)
        .join(" "),
    [displayPoints, viewSize, view],
  );

  // --- VENATION MODE ---

  const currentVeins: VeinData = useMemo(() => ensureVeinData(geom.veins), [geom.veins]);
  const veinEdges = useMemo(() => flattenVeinEdges(currentVeins.root), [currentVeins]);
  const selectedVeinNode = useMemo(
    () => (selectedNodeId ? findVeinNode(currentVeins.root, selectedNodeId) : null),
    [currentVeins, selectedNodeId],
  );
  const selectedIsRoot = selectedVeinNode?.id === currentVeins.root.id;
  const selectedIsTip = !!selectedVeinNode && selectedVeinNode.children.length === 0;
  const selectedIsJoint = !!selectedVeinNode && selectedVeinNode.children.length > 0;

  const regenOutline = (veinsOverride?: VeinData, paramsOverride?: VeinGenParams, record = true) => {
    const veins = veinsOverride || ensureVeinData(geomRef.current.veins);
    const params = paramsOverride || genParamsRef.current;
    const points = generateOutlineFromVeins(veins, { mirrorX: true, params });
    setGeom({ ...geomRef.current, points, veins: { ...veins, params } }, record);
  };

  const setVeinRoot = (root: VeinNode) =>
    regenOutline({ ...ensureVeinData(geomRef.current.veins), root }, undefined, false);

  const updateParam = (key: keyof VeinGenParams, value: number) => {
    const params = { ...genParamsRef.current, [key]: value };
    setGenParams(params);
    regenOutline(undefined, params, false);
  };

  const veinMergeThreshold = () => (enableSnap && gridSnap > 0 ? Math.max(gridSnap * 0.6, 0.05) : 0.08);

  const snapToAxis = (rawX: number) => {
    const ax = Math.abs(rawX);
    return ax <= veinMergeThreshold() ? 0 : ax;
  };

  const onVeinNodePointerDown = (e: PointerEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pushState(geomRef.current);
    setSelectedNodeId(nodeId);
    dragUntilRelease(
      (moveEv) => {
        const pt = leafCoordAt(moveEv);
        const root = ensureVeinData(geomRef.current.veins).root;
        setVeinRoot(
          updateVeinTree(root, nodeId, (node) => ({ ...node, x: round2(snapToAxis(pt.x)), y: round2(pt.y) })),
        );
      },
      () => {
        // Dropped close to another node -> merge into it.
        const root = ensureVeinData(geomRef.current.veins).root;
        const { root: mergedRoot, mergedInto } = mergeNearbyVeinNode(root, nodeId, veinMergeThreshold());
        if (mergedInto) {
          setSelectedNodeId(mergedInto);
          setVeinRoot(mergedRoot);
        }
      },
    );
  };

  // Adds a vein under `parentId` (at `targetPt`, or a bit past the parent) and returns the id
  // of the node it ended up as: the new node or the one it merged into.
  const addVeinUnder = (parentId: string, targetPt?: Point) => {
    pushState(geomRef.current);
    const veins = ensureVeinData(geomRef.current.veins);
    const parent = findVeinNode(veins.root, parentId) || veins.root;
    const node = createVeinNode(
      targetPt ? snapToAxis(targetPt.x) : round2(parent.x + 0.5),
      targetPt ? targetPt.y : round2(parent.y + 0.4),
    );
    const withNode = addVeinChild(veins.root, parentId, node);
    const { root, mergedInto } = mergeNearbyVeinNode(withNode, node.id, veinMergeThreshold());
    setVeinRoot(root);
    return mergedInto || node.id;
  };

  const addVein = (targetPt?: Point) =>
    setSelectedNodeId(addVeinUnder(selectedNodeId || currentVeins.root.id, targetPt));

  const addSiblingVein = (targetPt?: Point) => {
    const parentId = veinEdges.find((e) => e.node.id === selectedNodeId)?.parent.id;
    if (!parentId) return addVein(targetPt);
    addVeinUnder(parentId, targetPt);
    setSelectedNodeId(parentId);
  };

  const removeSelectedNode = () => {
    if (!selectedNodeId || selectedNodeId === currentVeins.root.id) return;
    pushState(geomRef.current);
    setSelectedNodeId(null);
    setVeinRoot(removeVeinNode(currentVeins.root, selectedNodeId));
  };

  const nodeEditStart = useRef<LeafGeometry | null>(null);
  const updateSelectedNode = (patch: Partial<VeinNode>) => {
    if (!selectedNodeId) return;
    nodeEditStart.current ??= geomRef.current;
    setVeinRoot(
      updateVeinTree(ensureVeinData(geomRef.current.veins).root, selectedNodeId, (node) => ({ ...node, ...patch })),
    );
  };
  const commitNodeEdit = () => {
    if (nodeEditStart.current) pushState(nodeEditStart.current);
    nodeEditStart.current = null;
  };

  const onCanvasClick = (e: MouseEvent) => {
    if (dragRef.current || e.shiftKey) return;
    addVein(leafCoordAt(e));
  };

  const selectRoot = (e: MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(currentVeins.root.id);
  };

  const originScreen = toScreen({ x: 0, y: 0 });
  const patternStep = Math.max(gridSnap * scale, 4);
  const hasTeeth = geom.margin && geom.margin !== "entire";

  return (
    <div class="geom-viewport" ref={containerRef}>
      <div class="overlay-header">
        <div class="toolbar-group">
          <button onClick={() => window.history.back()}>Back</button>
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z / Cmd+Z)">
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y / Cmd+Shift+Z)">
            Redo
          </button>
        </div>

        <div class="toolbar-group">
          <input
            type="text"
            class="geom-name"
            value={geom.name}
            onInput={(e) => setGeom({ ...geom, name: e.currentTarget.value })}
            placeholder="Geometry Name"
          />
        </div>

        <div class="toolbar-group">
          <select
            value={geom.margin || "entire"}
            onChange={(e) => setGeom({ ...geom, margin: e.currentTarget.value as LeafMargin })}
            title="Botanical margin (edge) type of this leaf shape"
          >
            <option value="entire">Entire</option>
            <option value="serrate">Serrate</option>
            <option value="dentate">Dentate</option>
            <option value="lobed">Lobed</option>
            <option value="incised">Incised</option>
          </select>
        </div>

        {hasTeeth && (
          <div class="toolbar-group" style={{ flexWrap: "wrap" }}>
            <SliderInput
              label="Tooth Size"
              min={0.2}
              max={3}
              step={0.05}
              value={geom.marginToothSize ?? 1}
              onInput={(v) => setGeom({ ...geom, marginToothSize: v })}
              defaultValue={1}
              inline
              style={{ width: "160px" }}
            />
            <SliderInput
              label="Tooth Depth"
              min={0}
              max={3}
              step={0.05}
              value={geom.marginToothDepth ?? 1}
              onInput={(v) => setGeom({ ...geom, marginToothDepth: v })}
              defaultValue={1}
              inline
              style={{ width: "160px" }}
            />
          </div>
        )}

        <div class="toolbar-group">
          <label class="label-row">
            <input type="checkbox" checked={enableSnap} onChange={(e) => setEnableSnap(e.currentTarget.checked)} />
            Snap
          </label>
          {enableSnap && (
            <label class="label-row">
              Grid:
              <input
                type="number"
                min="0.01"
                max="5"
                step="0.01"
                style={{ width: "60px" }}
                value={gridSnap}
                onInput={(e) => {
                  const val = parseFloat(e.currentTarget.value);
                  if (!isNaN(val) && val > 0) setGridSnap(val);
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div class="vein-controls-box">
        <div class="vein-controls-actions">
          <button onClick={() => addVein()} title="Add a new vein branching off the selected node (or the base)">
            + Vein
          </button>
          <button
            onClick={() => addSiblingVein()}
            title="Add a new vein next to the selected one, sharing its parent joint — use this repeatedly to build a palmate fan of many veins radiating from one point"
          >
            + Sibling
          </button>
          {selectedNodeId && !selectedIsRoot && (
            <button onClick={removeSelectedNode} title="Delete selected vein & its branches">
              Delete Vein
            </button>
          )}
          <button onClick={() => regenOutline()} title="Re-calculate polygon outline from vein structure">
            Generate Outline
          </button>
        </div>

        <div class="vein-params-panel">
          <h4>Outline Shape</h4>
          <SliderInput
            label="Default Lobe Depth"
            min={0}
            max={1}
            step={0.02}
            value={genParams.lobeDepth}
            onInput={(v) => updateParam("lobeDepth", v)}
            defaultValue={DEFAULT_VEIN_PARAMS.lobeDepth}
            inline
          />
          <SliderInput
            label="Lobe Threshold"
            min={0}
            max={1}
            step={0.02}
            value={genParams.lobeThreshold}
            onInput={(v) => updateParam("lobeThreshold", v)}
            defaultValue={DEFAULT_VEIN_PARAMS.lobeThreshold}
            inline
          />
          <SliderInput
            label="Default Tip Offset"
            min={0}
            max={0.5}
            step={0.01}
            value={genParams.tipOffset}
            onInput={(v) => updateParam("tipOffset", v)}
            defaultValue={DEFAULT_VEIN_PARAMS.tipOffset}
            inline
          />
          <SliderInput
            label="Default Roundness"
            min={0}
            max={1}
            step={0.02}
            value={genParams.curvature}
            onInput={(v) => updateParam("curvature", v)}
            defaultValue={DEFAULT_VEIN_PARAMS.curvature}
            inline
          />
          <SliderInput
            label="Subdivisions"
            min={1}
            max={12}
            step={1}
            value={genParams.subdivisions}
            onInput={(v) => updateParam("subdivisions", v)}
            defaultValue={DEFAULT_VEIN_PARAMS.subdivisions}
            inline
          />
        </div>

        {selectedVeinNode && (
          <div class="vein-params-panel vein-selected-panel">
            <h4>{selectedIsRoot ? "Leaf Base" : "Selected Vein"}</h4>
            <SliderInput
              label="Bend (°)"
              min={-MAX_ROTATION_DEG}
              max={MAX_ROTATION_DEG}
              step={1}
              value={selectedVeinNode.bend ?? 0}
              onInput={(v) => updateSelectedNode({ bend: v })}
              onChange={commitNodeEdit}
              defaultValue={0}
              inline
            />
            {selectedIsJoint && (
              <>
                <SliderInput
                  label="Fold (°)"
                  min={-MAX_ROTATION_DEG}
                  max={MAX_ROTATION_DEG}
                  step={1}
                  value={selectedVeinNode.fold ?? 0}
                  onInput={(v) => updateSelectedNode({ fold: v })}
                  onChange={commitNodeEdit}
                  defaultValue={0}
                  inline
                />
                <SliderInput
                  label="Lobe Depth"
                  min={0}
                  max={1}
                  step={0.02}
                  value={getEffectiveLobeDepth(selectedVeinNode, genParams)}
                  onInput={(v) => updateSelectedNode({ lobeDepth: v })}
                  onChange={commitNodeEdit}
                  defaultValue={DEFAULT_VEIN_PARAMS.lobeDepth}
                  inline
                />
                <SliderInput
                  label="Lobe Threshold"
                  min={0}
                  max={1}
                  step={0.02}
                  value={getEffectiveLobeThreshold(selectedVeinNode, genParams)}
                  onInput={(v) => updateSelectedNode({ lobeThreshold: v })}
                  onChange={commitNodeEdit}
                  defaultValue={DEFAULT_VEIN_PARAMS.lobeThreshold}
                  inline
                />
              </>
            )}
            {!selectedIsRoot && (
              <SliderInput
                label="Lateral Offset"
                min={0}
                max={2}
                step={0.02}
                value={getEffectiveLateralOffset(selectedVeinNode, genParams)}
                onInput={(v) => updateSelectedNode({ lateralOffset: v })}
                onChange={commitNodeEdit}
                defaultValue={DEFAULT_VEIN_PARAMS.lateralOffset}
                inline
              />
            )}
            {selectedIsTip && (
              <>
                <SliderInput
                  label="Tip Offset"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={getEffectiveTipParams(selectedVeinNode, genParams).tipOffset}
                  onInput={(v) => updateSelectedNode({ tipOffset: v })}
                  onChange={commitNodeEdit}
                  defaultValue={DEFAULT_VEIN_PARAMS.tipOffset}
                  inline
                />
                <SliderInput
                  label="Roundness"
                  min={0}
                  max={1}
                  step={0.02}
                  value={getEffectiveTipParams(selectedVeinNode, genParams).curvature}
                  onInput={(v) => updateSelectedNode({ curvature: v })}
                  onChange={commitNodeEdit}
                  defaultValue={DEFAULT_VEIN_PARAMS.curvature}
                  inline
                />
              </>
            )}
          </div>
        )}
      </div>

      <svg id="canvas" ref={canvasRef} onClick={onCanvasClick} onPointerDown={onCanvasPointerDown}>
        <defs>
          <pattern
            id="dot-grid"
            width={patternStep}
            height={patternStep}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${originScreen.x % patternStep}, ${originScreen.y % patternStep})`}
          >
            <circle cx={patternStep} cy={patternStep} r="1.5" fill="var(--bg-3)" />
          </pattern>
        </defs>
        {enableSnap && <rect width="100%" height="100%" fill="url(#dot-grid)" />}

        {/* The mirrored left side is dimmed */}
        <rect
          x={0}
          y={0}
          width={originScreen.x}
          height={viewSize.height}
          fill="rgba(0, 0, 0, 0.35)"
          style={{ pointerEvents: "none" }}
        />
        <line x1={originScreen.x} y1={0} x2={originScreen.x} y2={viewSize.height} class="midrib-axis" />
        <line x1={0} y1={originScreen.y} x2={viewSize.width} y2={originScreen.y} class="axis-line" />

        <polygon points={pointsString} class="leaf-shape-polygon" />

        {veinEdges.map(({ parent, node }) => {
          const onMidrib = Math.abs(parent.x) < 0.03 && Math.abs(node.x) < 0.03;
          const from = toScreen(parent);
          const to = toScreen(node);
          const fromMirrored = toScreen({ x: -parent.x, y: parent.y });
          const toMirrored = toScreen({ x: -node.x, y: node.y });
          const showMirror = Math.abs(parent.x) > 0.001 || Math.abs(node.x) > 0.001;
          // A halo behind the edge shows how strongly it is bent or folded.
          const maxAngle = Math.max(Math.abs(node.bend ?? 0), Math.abs(node.fold ?? 0));
          const haloOpacity = maxAngle ? Math.min(1, maxAngle / MAX_ROTATION_DEG) * 0.7 : 0;

          return (
            <g key={`vein-edge-${node.id}`}>
              {haloOpacity > 0.02 && (
                <>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    class="vein-fold-halo"
                    style={{ opacity: haloOpacity }}
                  />
                  {showMirror && (
                    <line
                      x1={fromMirrored.x}
                      y1={fromMirrored.y}
                      x2={toMirrored.x}
                      y2={toMirrored.y}
                      class="vein-fold-halo"
                      style={{ opacity: haloOpacity }}
                    />
                  )}
                </>
              )}
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} class={`vein-line ${onMidrib ? "midrib" : ""}`} />
              {showMirror && (
                <line
                  x1={fromMirrored.x}
                  y1={fromMirrored.y}
                  x2={toMirrored.x}
                  y2={toMirrored.y}
                  class="vein-line"
                  data-mirrored="true"
                />
              )}
            </g>
          );
        })}

        {veinEdges.map(({ node }) => {
          const sp = toScreen(node);
          const spMirrored = toScreen({ x: -node.x, y: node.y });
          const isTip = node.children.length === 0;
          return (
            <g key={`vein-handle-${node.id}`}>
              <circle
                cx={sp.x}
                cy={sp.y}
                r={isTip ? 6 : 5.5}
                class="vein-handle"
                data-selected={selectedNodeId === node.id}
                data-tip={isTip}
                onPointerDown={(e) => onVeinNodePointerDown(e, node.id)}
              >
                <title>
                  {isTip
                    ? "Vein tip — drag to reshape the outline, click canvas to branch further"
                    : "Branch joint — drag to move, click canvas to add another vein from here"}
                </title>
              </circle>
              {node.x > 0.001 && (
                <circle cx={spMirrored.x} cy={spMirrored.y} r="5" class="vein-handle" data-mirrored="true" />
              )}
            </g>
          );
        })}

        <circle
          cx={originScreen.x}
          cy={originScreen.y}
          r="7"
          class="petiole-base-dot"
          data-selected={selectedNodeId === currentVeins.root.id}
          onClick={selectRoot}
        >
          <title>
            Stem origin (0,0). Click to select the root vein node — its Bend/Fold (whole-blade hinge at the petiole)
            and, once it branches into more than one vein, Lobe controls appear in the side panel.
          </title>
        </circle>
      </svg>
    </div>
  );
}
