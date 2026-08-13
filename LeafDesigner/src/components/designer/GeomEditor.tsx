import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { LeafGeometry, VeinData, VeinNode, VeinGenParams } from "../../types/leaf";
import { state } from "../../pages/AppState";
import { useLocation } from "preact-iso";
import { useHistory } from "../../hooks/useHistory";
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
  getEffectiveLobeDepth,
  getEffectiveLobeThreshold,
  MAX_FOLD_ANGLE_DEG,
  DEFAULT_VEIN_PARAMS,
  migrateVeinData,
} from "../../utils/veinGenerator";
import { SliderInput } from "../common/SliderInput";
import "./GeomEditor.css";

const r2 = (v: number) => Math.round(v * 100) / 100;

type Point = { x: number; y: number };

function buildSymmetricContour(points: Point[]): Point[] {
  const rightHalf = points.filter((p) => p.x >= 0);
  if (rightHalf.length === 0) return points;

  const rightEdgeOnly = rightHalf.filter((p) => p.x > 0);
  const leftHalf = [...rightEdgeOnly].reverse().map((p) => ({ x: -p.x, y: p.y }));

  return [...rightHalf, ...leftHalf];
}

export function GeomEditor({ id }: { id: string }) {
  const location = useLocation();
  const initialGeom = state.geoms.get(id);

  if (!initialGeom) {
    return (
      <div className="geom-viewport" style={{ padding: "2rem" }}>
        <h2>Geometry Not Found</h2>
        <p>Could not find geometry with ID: {id}</p>
        <button onClick={() => location.route("/leaf")}>Back to Designer</button>
      </div>
    );
  }

  const {
    state: geom,
    set: setGeom,
    undo,
    redo,
    canUndo,
    canRedo,
    pushState,
  } = useHistory<LeafGeometry>(initialGeom);

  const [editorMode, setEditorMode] = useState<"outline" | "veins">("outline");
  const [selectedPoint, setSelectedPoint] = useState<number>(-1);
  // Currently active vein node — acts as the "parent" a newly added vein attaches to.
  // null means "the root" (the stem base).
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const initParams: VeinGenParams = initialGeom.veins.params || { ...DEFAULT_VEIN_PARAMS };
  const [genParams, setGenParams] = useState<VeinGenParams>(initParams);

  const [enableSnap, setEnableSnap] = useState<boolean>(true);
  const [gridSnap, setGridSnap] = useState<number>(0.1);
  const [mirrorX, setMirrorX] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 600 });
  const [offset] = useState<Point>({ x: 0, y: 0 });
  const zoom = 140;

  const draggedRef = useRef<number>(-1);
  const isDraggingOriginRef = useRef<boolean>(false);
  const isDraggingVeinRef = useRef<boolean>(false);
  const didMoveRef = useRef<boolean>(false);

  const geomRef = useRef<LeafGeometry>(geom);
  geomRef.current = geom;

  const mirrorXRef = useRef<boolean>(mirrorX);
  mirrorXRef.current = mirrorX;

  const genParamsRef = useRef<VeinGenParams>(genParams);
  genParamsRef.current = genParams;

  useEffect(() => {
    state.geoms.updateById(geom.id, geom);
  }, [geom]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Global Keyboard Shortcuts (Undo/Redo & Delete)
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      const isInput =
        ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement;

      // Undo / Redo
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        if (ev.shiftKey) {
          ev.preventDefault();
          redo();
        } else {
          ev.preventDefault();
          undo();
        }
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        redo();
        return;
      }

      // Delete selected point
      if (!isInput && (ev.key === "Backspace" || ev.key === "Delete")) {
        if (editorMode === "outline") {
          removeSelectedPoint();
        } else if (editorMode === "veins" && selectedNodeId) {
          removeSelectedNode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPoint, selectedNodeId, editorMode, geom, mirrorX, undo, redo]);

  const centerX = viewSize.width / 2;
  const centerY = viewSize.height / 2 + 80;

  // Screen <-> Leaf unit conversions
  const toScreen = (p: Point): Point => ({
    x: centerX + offset.x + p.x * zoom,
    y: centerY + offset.y - p.y * zoom,
  });

  const toLeafCoord = (screenX: number, screenY: number): Point => {
    const rawX = (screenX - centerX - offset.x) / zoom;
    const rawY = (centerY + offset.y - screenY) / zoom;

    if (!enableSnap || gridSnap <= 0) {
      return { x: Math.round(rawX * 100) / 100, y: Math.round(rawY * 100) / 100 };
    }
    return {
      x: Math.round(rawX / gridSnap) * gridSnap,
      y: Math.round(rawY / gridSnap) * gridSnap,
    };
  };

  const pointsString = useMemo(() => {
    return geom.points
      ?.map((p) => {
        const sp = toScreen(p);
        return `${sp.x.toFixed(1)},${sp.y.toFixed(1)}`;
      })
      .join(" ");
  }, [geom.points, viewSize, offset, zoom]);

  const toggleMirrorX = (enabled: boolean) => {
    setMirrorX(enabled);
    if (enabled) {
      const symmetricPoints = buildSymmetricContour(geom.points);
      setGeom({ ...geom, points: symmetricPoints });
    }
  };

  const handlePointMouseDown = (e: MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Snapshot state before dragging for Undo
    pushState(geomRef.current);
    draggedRef.current = index;
    didMoveRef.current = false;
    setSelectedPoint(index);

    const handleMouseMove = (moveEv: MouseEvent) => {
      if (draggedRef.current === -1) return;
      didMoveRef.current = true;

      const svg = canvasRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const newPt = toLeafCoord(moveEv.clientX - rect.left, moveEv.clientY - rect.top);

      if (mirrorXRef.current && newPt.x < 0) {
        newPt.x = 0;
      }

      const currentGeom = geomRef.current;
      if (currentGeom && currentGeom.points[draggedRef.current]) {
        const updatedPoints = [...currentGeom.points];
        updatedPoints[draggedRef.current] = newPt;

        if (mirrorXRef.current) {
          const symmetric = buildSymmetricContour(updatedPoints);
          setGeom({ ...currentGeom, points: symmetric }, false);
        } else {
          setGeom({ ...currentGeom, points: updatedPoints }, false);
        }
      }
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        draggedRef.current = -1;
      }, 50);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Move origin dot
  const handleOriginMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    pushState(geomRef.current);
    isDraggingOriginRef.current = true;
    didMoveRef.current = false;

    const initialPoints = [...geomRef.current.points];
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEv: MouseEvent) => {
      didMoveRef.current = true;

      let dx = (moveEv.clientX - startX) / zoom;
      let dy = -(moveEv.clientY - startY) / zoom;

      if (enableSnap && gridSnap > 0) {
        dx = Math.round(dx / gridSnap) * gridSnap;
        dy = Math.round(dy / gridSnap) * gridSnap;
      }

      if (mirrorXRef.current) dx = 0;
      if (dx === 0 && dy === 0) return;

      const currentGeom = geomRef.current;
      if (!currentGeom) return;

      const shifted = initialPoints.map((p) => ({
        x: Math.round((p.x - dx) * 100) / 100,
        y: Math.round((p.y - dy) * 100) / 100,
      }));

      const symmetric = mirrorXRef.current ? buildSymmetricContour(shifted) : shifted;
      setGeom({ ...currentGeom, points: symmetric }, false);
    };

    const handleMouseUp = () => {
      if (!didMoveRef.current && editorMode === "veins") setSelectedNodeId(null);
      setTimeout(() => {
        isDraggingOriginRef.current = false;
      }, 50);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const removeSelectedPoint = () => {
    if (selectedPoint < 0 || selectedPoint >= geom.points.length) return;
    if (geom.points.length <= 3) {
      alert("A leaf shape requires at least 3 points.");
      return;
    }

    const updated = geom.points.filter((_, i) => i !== selectedPoint);
    const symmetric = mirrorX ? buildSymmetricContour(updated) : updated;
    const newSelected = Math.max(0, selectedPoint - 1);
    setSelectedPoint(newSelected);
    setGeom({ ...geom, points: symmetric });
  };

  const insertPointOnSegment = (e: MouseEvent, afterIndex: number) => {
    const svg = canvasRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const leafPt = toLeafCoord(e.clientX - rect.left, e.clientY - rect.top);

    if (mirrorX && leafPt.x < 0) leafPt.x = Math.abs(leafPt.x);

    const newIndex = afterIndex + 1;
    const updated = [...geom.points];
    updated.splice(newIndex, 0, leafPt);

    const symmetric = mirrorX ? buildSymmetricContour(updated) : updated;
    setGeom({ ...geom, points: symmetric });

    const insertedIdx = symmetric.findIndex(
      (p) => Math.abs(p.x - leafPt.x) < 0.001 && Math.abs(p.y - leafPt.y) < 0.001,
    );
    const targetIdx = insertedIdx !== -1 ? insertedIdx : newIndex;
    setSelectedPoint(targetIdx);

    handlePointMouseDown(e, targetIdx);
  };

  // --- VENATION MODE HANDLERS & TREE-DRIVEN OUTLINE GENERATION ---

  const currentVeins: VeinData = useMemo(() => {
    return migrateVeinData(geom.veins);
  }, [geom.veins]);

  // Flattened (parent, node) edges of the vein tree — used for rendering & hit testing.
  const veinEdges = useMemo(() => flattenVeinEdges(currentVeins.root), [currentVeins]);

  // The currently selected vein node (if any) plus whether it's a tip (terminal, no children).
  const selectedVeinNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return findVeinNode(currentVeins.root, selectedNodeId);
  }, [currentVeins, selectedNodeId]);
  const selectedIsRoot = selectedVeinNode?.id === currentVeins.root.id;
  const selectedIsTip = !!selectedVeinNode && selectedVeinNode.children.length === 0;
  const selectedIsJoint = !!selectedVeinNode && selectedVeinNode.children.length > 0;
  const selectedTipParams = useMemo(
    () => (selectedVeinNode ? getEffectiveTipParams(selectedVeinNode, genParams) : null),
    [selectedVeinNode, genParams],
  );
  const selectedLobeDepth = useMemo(
    () => (selectedVeinNode ? getEffectiveLobeDepth(selectedVeinNode, genParams) : null),
    [selectedVeinNode, genParams],
  );
  const selectedLobeThreshold = useMemo(
    () => (selectedVeinNode ? getEffectiveLobeThreshold(selectedVeinNode, genParams) : null),
    [selectedVeinNode, genParams],
  );

  /** Regenerate outline from veins using given (or current) params */
  const regenOutline = (
    veinsOverride?: VeinData,
    paramsOverride?: VeinGenParams,
    record = true,
  ) => {
    const v = veinsOverride || migrateVeinData(geomRef.current.veins);
    const p = paramsOverride || genParamsRef.current;

    const generatedPoints = generateOutlineFromVeins(v, {
      mirrorX: mirrorXRef.current,
      params: p,
    });

    setGeom(
      {
        ...geomRef.current,
        points: generatedPoints,
        veins: { ...v, params: p },
      },
      record,
    );
  };

  /** Update a single generation parameter and live-regenerate */
  const updateParam = (key: keyof VeinGenParams, value: number) => {
    const newParams = { ...genParamsRef.current, [key]: value };
    setGenParams(newParams);
    regenOutline(undefined, newParams, false);
  };

  /** How close two vein nodes need to be (in leaf units) before they snap together into one. */
  const veinMergeThreshold = () =>
    enableSnap && gridSnap > 0 ? Math.max(gridSnap * 0.6, 0.05) : 0.08;

  /** Once a vein point is this close to the centerline, snap it exactly onto x = 0 — a
   *  vein on the axis renders and generates as a single, unmirrored line instead of a pair. */
  const snapToAxis = (rawX: number) => {
    const ax = Math.abs(rawX);
    return ax <= veinMergeThreshold() ? 0 : ax;
  };

  /** Drag any vein node (branch joint or tip) to a new position. */
  const handleVeinNodeMouseDown = (e: MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    pushState(geomRef.current);
    isDraggingVeinRef.current = true;
    didMoveRef.current = false;
    setSelectedNodeId(nodeId);

    const handleMouseMove = (moveEv: MouseEvent) => {
      didMoveRef.current = true;
      const svg = canvasRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const pt = toLeafCoord(moveEv.clientX - rect.left, moveEv.clientY - rect.top);

      const veins = migrateVeinData(geomRef.current.veins);
      const newX = snapToAxis(pt.x);
      const newY = Math.max(0.05, pt.y);
      const updatedRoot = updateVeinTree(veins.root, nodeId, (node) => ({
        ...node,
        x: r2(newX),
        y: r2(newY),
      }));

      regenOutline({ ...veins, root: updatedRoot }, undefined, false);
    };

    const handleMouseUp = () => {
      setTimeout(() => {
        isDraggingVeinRef.current = false;
      }, 50);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      // Dropped close to another node? Merge into it instead of leaving a near-duplicate point.
      const veins = migrateVeinData(geomRef.current.veins);
      const { root: mergedRoot, mergedInto } = mergeNearbyVeinNode(
        veins.root,
        nodeId,
        veinMergeThreshold(),
      );
      if (mergedInto) {
        setSelectedNodeId(mergedInto);
        regenOutline({ ...veins, root: mergedRoot }, undefined, false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  /** Add a new vein node as a child of the selected node (or the root/base if none selected). */
  const addVeinNode = (targetPt?: Point) => {
    pushState(geomRef.current);
    const veins = migrateVeinData(geomRef.current.veins);
    const parentId = selectedNodeId || veins.root.id;
    const parent = findVeinNode(veins.root, parentId) || veins.root;

    const x = targetPt ? snapToAxis(targetPt.x) : r2(parent.x + 0.5);
    const y = targetPt ? Math.max(parent.y + 0.05, targetPt.y) : r2(parent.y + 0.4);

    const newNode = createVeinNode(x, y);
    const rootWithNewNode = addVeinChild(veins.root, parentId, newNode);

    // If the new point landed right on top of an existing one, merge them instead of
    // leaving a near-duplicate node (e.g. clicking almost exactly on the parent again).
    const { root: updatedRoot, mergedInto } = mergeNearbyVeinNode(
      rootWithNewNode,
      newNode.id,
      veinMergeThreshold(),
    );

    setSelectedNodeId(mergedInto || newNode.id);
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  /** Remove the selected vein node and everything branching off it. The root can't be removed. */
  const removeSelectedNode = () => {
    if (!selectedNodeId) return;
    const veins = migrateVeinData(geomRef.current.veins);
    if (selectedNodeId === veins.root.id) return;

    pushState(geomRef.current);
    const updatedRoot = removeVeinNode(veins.root, selectedNodeId);
    setSelectedNodeId(null);
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  /** Fold angle lives on every non-root node (it describes the edge from its parent to it). */
  const updateSelectedFoldAngle = (value: number) => {
    if (!selectedNodeId) return;
    const veins = migrateVeinData(geomRef.current.veins);
    if (selectedNodeId === veins.root.id) return;

    const updatedRoot = updateVeinTree(veins.root, selectedNodeId, (node) => ({
      ...node,
      foldAngle: value,
    }));
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  /** Lobe depth override only makes sense on a branch joint (it shapes the sinus between its children). */
  const updateSelectedLobeDepth = (value: number) => {
    if (!selectedNodeId) return;
    const veins = migrateVeinData(geomRef.current.veins);

    const updatedRoot = updateVeinTree(veins.root, selectedNodeId, (node) => ({
      ...node,
      lobeDepth: value,
    }));
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  /** Same as above, for the minimum sibling-gap distance before a lobe forms at all. */
  const updateSelectedLobeThreshold = (value: number) => {
    if (!selectedNodeId) return;
    const veins = migrateVeinData(geomRef.current.veins);

    const updatedRoot = updateVeinTree(veins.root, selectedNodeId, (node) => ({
      ...node,
      lobeThreshold: value,
    }));
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  /** Margin/curvature/smoothing overrides only make sense on a terminal vein (a tip). */
  const updateSelectedTipParam = (key: "margin" | "curvature" | "smoothing", value: number) => {
    if (!selectedNodeId) return;
    const veins = migrateVeinData(geomRef.current.veins);

    const updatedRoot = updateVeinTree(veins.root, selectedNodeId, (node) => ({
      ...node,
      [key]: value,
    }));
    regenOutline({ ...veins, root: updatedRoot }, undefined, false);
  };

  const onCanvasClick = (e: MouseEvent) => {
    if (
      didMoveRef.current ||
      draggedRef.current !== -1 ||
      isDraggingOriginRef.current ||
      isDraggingVeinRef.current
    )
      return;

    const svg = canvasRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const leafPt = toLeafCoord(e.clientX - rect.left, e.clientY - rect.top);

    if (editorMode === "outline") {
      if (mirrorX && leafPt.x < 0) leafPt.x = Math.abs(leafPt.x);
      const updated = [...geom.points, leafPt];
      const symmetric = mirrorX ? buildSymmetricContour(updated) : updated;
      setSelectedPoint(symmetric.length - 1);
      setGeom({ ...geom, points: symmetric });
    } else if (editorMode === "veins") {
      addVeinNode(leafPt);
    }
  };

  const originScreen = toScreen({ x: 0, y: 0 });
  const patternStep = Math.max(gridSnap * zoom, 4);

  return (
    <div className="geom-viewport" ref={containerRef}>
      {/* Header */}
      <div className="overlay-header">
        <div className="toolbar-group">
          <button onClick={() => location.route("/")}>Back to Library</button>
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z / Cmd+Z)">
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y / Cmd+Shift+Z)">
            Redo
          </button>
        </div>

        {/* Mode Selector */}
        <div className="toolbar-group">
          <div className="mode-btn-group">
            <button
              className={`mode-btn ${editorMode === "outline" ? "active" : ""}`}
              onClick={() => setEditorMode("outline")}
            >
              Outline Mode
            </button>
            <button
              className={`mode-btn ${editorMode === "veins" ? "active" : ""}`}
              onClick={() => setEditorMode("veins")}
            >
              Venation Mode
            </button>
          </div>
        </div>

        <div className="toolbar-group">
          <input
            type="text"
            style={{
              background: "var(--bg-1)",
              color: "var(--fg-0)",
              border: "1px solid var(--bg-3)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "0.95rem",
              fontWeight: "bold",
              width: "140px",
            }}
            value={geom.name}
            onInput={(e) => setGeom({ ...geom, name: e.currentTarget.value })}
            placeholder="Geometry Name"
          />
        </div>

        <div className="toolbar-group">
          <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="checkbox"
              checked={enableSnap}
              onChange={(e) => setEnableSnap(e.currentTarget.checked)}
            />
            Snap
          </label>

          {enableSnap && (
            <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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

          <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="checkbox"
              checked={mirrorX}
              onChange={(e) => toggleMirrorX(e.currentTarget.checked)}
            />
            Mirror X
          </label>
        </div>

      </div>

      {/* VENATION CONTROLS  */}
      {editorMode === "veins" && (
        <div className="vein-controls-box">
        <div className="vein-controls-actions">
          <button
            onClick={() => addVeinNode()}
            title="Add a new vein branching off the selected node (or the base)"
          >
            + Vein
          </button>
          {selectedNodeId && (
            <button onClick={() => removeSelectedNode()} title="Delete selected vein & its branches">
              Delete Vein
            </button>
          )}
          <button
            onClick={() => regenOutline()}
            title="Re-calculate polygon outline from vein structure"
          >
            Generate Outline
          </button>
        </div>

        <div className="vein-params-panel">
          <h4>Outline Shape</h4>

          <SliderInput
            label="Default Lobe Depth"
            min={0}
            max={1}
            step={0.02}
            value={genParams.lobeDepth}
            onInput={(v) => updateParam("lobeDepth", v)}
            inline
          />
          <SliderInput
            label="Lobe Threshold"
            min={0}
            max={1}
            step={0.02}
            value={genParams.lobeThreshold}
            onInput={(v) => updateParam("lobeThreshold", v)}
            inline
          />
          <SliderInput
            label="Default Margin"
            min={0}
            max={0.5}
            step={0.01}
            value={genParams.margin}
            onInput={(v) => updateParam("margin", v)}
            inline
          />
          <SliderInput
            label="Base Width"
            min={0}
            max={1}
            step={0.02}
            value={genParams.baseWidth}
            onInput={(v) => updateParam("baseWidth", v)}
            inline
          />
          <SliderInput
            label="Default Curvature"
            min={0}
            max={1}
            step={0.02}
            value={genParams.curvature}
            onInput={(v) => updateParam("curvature", v)}
            inline
          />
          <SliderInput
            label="Default Smoothing"
            min={2}
            max={8}
            step={1}
            value={genParams.smoothing}
            onInput={(v) => updateParam("smoothing", v)}
            inline
          />
        </div>

        {/* Shown once a vein node (other than the root/base) is selected */}
        {selectedVeinNode && !selectedIsRoot && (
        <div className="vein-params-panel vein-selected-panel">
          <h4>Selected Vein</h4>

          <SliderInput
            label="Fold Angle (°)"
            min={-MAX_FOLD_ANGLE_DEG}
            max={MAX_FOLD_ANGLE_DEG}
            step={1}
            value={selectedVeinNode.foldAngle ?? 0}
            onInput={(v) => updateSelectedFoldAngle(v)}
            inline
          />

          {selectedIsJoint && selectedLobeDepth !== null && (
            <SliderInput
              label="Lobe Depth"
              min={0}
              max={1}
              step={0.02}
              value={selectedLobeDepth}
              onInput={(v) => updateSelectedLobeDepth(v)}
              inline
            />
          )}

          {selectedIsJoint && selectedLobeThreshold !== null && (
            <SliderInput
              label="Lobe Threshold"
              min={0}
              max={1}
              step={0.02}
              value={selectedLobeThreshold}
              onInput={(v) => updateSelectedLobeThreshold(v)}
              inline
            />
          )}

          {selectedIsTip && selectedTipParams && (
            <>
              <SliderInput
                label="Margin"
                min={0}
                max={0.5}
                step={0.01}
                value={selectedTipParams.margin}
                onInput={(v) => updateSelectedTipParam("margin", v)}
                inline
              />
              <SliderInput
                label="Curvature"
                min={0}
                max={1}
                step={0.02}
                value={selectedTipParams.curvature}
                onInput={(v) => updateSelectedTipParam("curvature", v)}
                inline
              />
              <SliderInput
                label="Smoothing"
                min={2}
                max={8}
                step={1}
                value={selectedTipParams.smoothing}
                onInput={(v) => updateSelectedTipParam("smoothing", v)}
                inline
              />
            </>
          )}
        </div>
        )}
        </div>
      )}

      {/* SVG Editor Viewport */}
      <svg id="canvas" ref={canvasRef} onClick={onCanvasClick}>
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

        {/* Dot grid background */}
        {enableSnap && <rect width="100%" height="100%" fill="url(#dot-grid)" />}

        {/* Dimmed overlay for mirrored left side if Mirror X is active */}
        {mirrorX && (
          <rect
            x={0}
            y={0}
            width={originScreen.x}
            height={viewSize.height}
            fill="rgba(0, 0, 0, 0.35)"
            style={{ pointerEvents: "none" }}
          />
        )}

        {/* Midrib and axis guide lines */}
        <line
          x1={originScreen.x}
          y1={0}
          x2={originScreen.x}
          y2={viewSize.height}
          className="midrib-axis"
        />
        <line
          x1={0}
          y1={originScreen.y}
          x2={viewSize.width}
          y2={originScreen.y}
          className="axis-line"
        />

        {/* Closed Leaf Polygon Outline */}
        <polygon
          points={pointsString}
          className={`leaf-shape-polygon ${editorMode === "veins" ? "dashed" : ""}`}
        />

        {/* --- OUTLINE MODE ELEMENTS --- */}
        {editorMode === "outline" && (
          <>
            {/* Segment line helpers for point insertion */}
            {geom.points?.map((p, i) => {
              const nextIdx = (i + 1) % geom.points.length;
              const sp1 = toScreen(p);
              const sp2 = toScreen(geom.points[nextIdx]);

              return (
                <line
                  key={`seg-${i}`}
                  x1={sp1.x}
                  y1={sp1.y}
                  x2={sp2.x}
                  y2={sp2.y}
                  className="line-helper"
                  onMouseDown={(e) => insertPointOnSegment(e, i)}
                />
              );
            })}

            {/* Control point handles for outline */}
            {geom.points?.map((p, i) => {
              const sp = toScreen(p);
              const isLeftMirrored = mirrorX && p.x < -0.001;
              return (
                <circle
                  key={`pt-${i}`}
                  cx={sp.x}
                  cy={sp.y}
                  r="6"
                  className="point-handle"
                  data-selected={i === selectedPoint}
                  data-mirrored={isLeftMirrored}
                  onMouseDown={(e) => handlePointMouseDown(e, i)}
                />
              );
            })}
          </>
        )}

        {/* --- VENATION MODE / VEIN TREE STRUCTURE ELEMENTS --- */}
        {/* Vein Edges (recursively covers midrib, secondaries, tertiaries, ...) */}
        {veinEdges.map(({ parent, node }) => {
          const isMidribish = Math.abs(parent.x) < 0.03 && Math.abs(node.x) < 0.03;
          const parentScreen = toScreen({ x: parent.x, y: parent.y });
          const nodeRightScreen = toScreen({ x: node.x, y: node.y });
          // The mirrored copy of this edge must run between the mirrored PARENT and the
          // mirrored node — not from the real (right-side) parent — otherwise any vein
          // that branches off an already off-axis vein (parent.x != 0) mirrors crooked.
          const parentMirroredScreen = toScreen({ x: -parent.x, y: parent.y });
          const nodeLeftScreen = toScreen({ x: -node.x, y: node.y });
          const needsMirrorLine = Math.abs(parent.x) > 0.001 || Math.abs(node.x) > 0.001;
          // Purely a visual hint in the editor — a halo under edges marked to fold later.
          const foldOpacity = node.foldAngle
            ? Math.min(1, Math.abs(node.foldAngle) / MAX_FOLD_ANGLE_DEG) * 0.7
            : 0;

          return (
            <g key={`vein-edge-${node.id}`}>
              {foldOpacity > 0.02 && (
                <>
                  <line
                    x1={parentScreen.x}
                    y1={parentScreen.y}
                    x2={nodeRightScreen.x}
                    y2={nodeRightScreen.y}
                    className="vein-fold-halo"
                    style={{ opacity: foldOpacity }}
                  />
                  {mirrorX && needsMirrorLine && (
                    <line
                      x1={parentMirroredScreen.x}
                      y1={parentMirroredScreen.y}
                      x2={nodeLeftScreen.x}
                      y2={nodeLeftScreen.y}
                      className="vein-fold-halo"
                      style={{ opacity: foldOpacity }}
                    />
                  )}
                </>
              )}
              <line
                x1={parentScreen.x}
                y1={parentScreen.y}
                x2={nodeRightScreen.x}
                y2={nodeRightScreen.y}
                className={`vein-line ${isMidribish ? "midrib" : ""}`}
              />
              {mirrorX && needsMirrorLine && (
                <line
                  x1={parentMirroredScreen.x}
                  y1={parentMirroredScreen.y}
                  x2={nodeLeftScreen.x}
                  y2={nodeLeftScreen.y}
                  className="vein-line"
                  data-mirrored="true"
                />
              )}
            </g>
          );
        })}

        {/* Handles in Venation Mode — every non-root vein node is a draggable handle */}
        {editorMode === "veins" && (
          <>
            {veinEdges.map(({ node }) => {
              const nodeRightScreen = toScreen({ x: node.x, y: node.y });
              const nodeLeftScreen = toScreen({ x: -node.x, y: node.y });
              const isSelected = selectedNodeId === node.id;
              const isTip = node.children.length === 0;

              return (
                <g key={`vein-handle-${node.id}`}>
                  <circle
                    cx={nodeRightScreen.x}
                    cy={nodeRightScreen.y}
                    r={isTip ? 6 : 5.5}
                    className="vein-handle"
                    data-selected={isSelected}
                    data-tip={isTip}
                    onMouseDown={(e) => handleVeinNodeMouseDown(e, node.id)}
                  >
                    <title>
                      {isTip
                        ? "Vein tip — drag to reshape the outline, click canvas to branch further"
                        : "Branch joint — drag to move, click canvas to add another vein from here"}
                    </title>
                  </circle>

                  {/* Left Mirrored Indicator */}
                  {mirrorX && node.x > 0.001 && (
                    <circle
                      cx={nodeLeftScreen.x}
                      cy={nodeLeftScreen.y}
                      r="5"
                      className="vein-handle"
                      data-mirrored="true"
                    />
                  )}
                </g>
              );
            })}
          </>
        )}

        {/* Draggable Stem Base Origin Dot at (0,0) — also the vein tree root */}
        <circle
          cx={originScreen.x}
          cy={originScreen.y}
          r="7"
          className="petiole-base-dot"
          data-selected={editorMode === "veins" && !selectedNodeId}
          onMouseDown={handleOriginMouseDown}
        >
          <title>
            Drag red dot to set Stem Origin (0,0). In Venation Mode, click it (no drag) to select
            the base as the branch parent.
          </title>
        </circle>
      </svg>
    </div>
  );
}
