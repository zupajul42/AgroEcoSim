import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { LeafGeometry } from "../../types/leaf";
import { state } from "../../pages/AppState";
import { useLocation } from "preact-iso";
import "./GeomEditor.css";

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

  const [geom, setGeom] = useState<LeafGeometry>(initialGeom);
  const [selectedPoint, setSelectedPoint] = useState<number>(-1);
  const [enableSnap, setEnableSnap] = useState<boolean>(true);
  const [gridSnap, setGridSnap] = useState<number>(0.1);
  const [mirrorX, setMirrorX] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const [viewSize, setViewSize] = useState({ width: 800, height: 600 });
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const zoom = 140; // Pixels per coordinate unit

  const draggedRef = useRef<number>(-1);
  const didMoveRef = useRef<boolean>(false);
  const geomRef = useRef<LeafGeometry>(geom);
  geomRef.current = geom;

  const mirrorXRef = useRef<boolean>(mirrorX);
  mirrorXRef.current = mirrorX;

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

  const centerX = viewSize.width / 2;
  const centerY = viewSize.height / 2 + 80; // Stem base slightly below center

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
          setGeom({ ...currentGeom, points: symmetric });
        } else {
          setGeom({ ...currentGeom, points: updatedPoints });
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

  const onCanvasClick = (e: MouseEvent) => {
    if (didMoveRef.current || draggedRef.current !== -1) return;

    const svg = canvasRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const leafPt = toLeafCoord(e.clientX - rect.left, e.clientY - rect.top);

    if (mirrorX && leafPt.x < 0) leafPt.x = Math.abs(leafPt.x);

    const updated = [...geom.points, leafPt];
    const symmetric = mirrorX ? buildSymmetricContour(updated) : updated;
    setSelectedPoint(symmetric.length - 1);
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

    // Immediately start dragging newly inserted point
    handlePointMouseDown(e, targetIdx);
  };

  const removeSelected = () => {
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

  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Backspace" || ev.key === "Delete") {
        removeSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPoint, geom, mirrorX]);

  const originScreen = toScreen({ x: 0, y: 0 });
  const patternStep = Math.max(gridSnap * zoom, 4);

  return (
    <div className="geom-viewport" ref={containerRef}>

      <div className="overlay-header">
        <div className="toolbar-group">
          <button onClick={() => location.route("/")}>Back to Library</button>
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
            <input type="checkbox" checked={enableSnap} onChange={(e) => setEnableSnap(e.currentTarget.checked)} />
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
                style={{ width: "65px" }}
                value={gridSnap}
                onInput={(e) => {
                  const val = parseFloat(e.currentTarget.value);
                  if (!isNaN(val) && val > 0) setGridSnap(val);
                }}
              />
            </label>
          )}
        </div>

        <div className="toolbar-group">
          <label style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input type="checkbox" checked={mirrorX} onChange={(e) => toggleMirrorX(e.currentTarget.checked)} />
            Mirror X
          </label>
        </div>
      </div>

      {/* SVG Editor Viewport */}
      <svg id="canvas" ref={canvasRef} onClick={onCanvasClick}>
        <defs>
          {/* Visual Dot Grid Overlay */}
          <pattern
            id="dot-grid"
            width={patternStep}
            height={patternStep}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${originScreen.x % patternStep}, ${originScreen.y % patternStep})`}
          >
            <circle cx={patternStep} cy={patternStep} r="1.5" fill="#444444" />
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

        {/* Midrib and Y-axis guide lines */}
        <line x1={originScreen.x} y1={0} x2={originScreen.x} y2={viewSize.height} className="midrib-axis" />
        <line x1={0} y1={originScreen.y} x2={viewSize.width} y2={originScreen.y} className="axis-line" />

        {/* Closed Leaf Polygon */}
        <polygon points={pointsString} className="leaf-shape-polygon" />

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

        {/* Stem base marker at (0,0) */}
        <circle cx={originScreen.x} cy={originScreen.y} r="5" className="petiole-base-dot" />

        {/* Control point handles */}
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
      </svg>

      <div className="overlay-footer">
        {geom.points?.length || 0} vertices |{" "}
        {mirrorX ? "MIRROR MODE (Active Right Half -> Auto-Reflected Left Half) | " : ""}
        Add, move or delete points
      </div>
    </div>
  );
}
