import { useEffect, useMemo, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { LeafGeometry } from "../../types/leaf";
import { state } from "../../pages/AppState";

type Point = { x: number; y: number };

export function GeomEditor({ id }: { id: string }) {
  const g = state.geoms.get(id);
  if (!g) {
    return <p>No geometry to edit found!</p>;
  }

  const [geom, setGeom] = useState<LeafGeometry>(g);
  //const [points, setPoints] = useState<Point[]>([]);

  const pointsString = useMemo(() => geom.points?.map((p) => `${p.x},${p.y}`).join(" "), [geom]);
  const [activePoint, setActivePoint] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<number>(-1);
  const [draggedPoint, setDraggedPoint] = useState<number>(-1);
  const [isClosed, setIsClosed] = useState(false);

  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [gridSnap, setGridSnap] = useState(10);

  useEffect(() => {
    //debugInit();
    //setIsClosed(true);
  }, []);

  useEffect(() => {
    state.geoms.updateById(geom.id, geom);
  }, [geom]);

  // settings:
  // - grid snap (true/false)
  // - grid size (10x10)
  // - mirror-x (true/false)

  // TODO: (next steps)
  // mirror

  const snap = (p: Point): Point => ({
    x: Math.round(p.x / gridSnap) * gridSnap,
    y: Math.round(p.y / gridSnap) * gridSnap,
  });

  const getPosition = (e: MouseEvent, snapping: boolean = true): Point => {
    const svg = document.querySelector("#canvas");
    if (!svg) return { x: -1, y: -1 };

    const rect = svg.getBoundingClientRect();
    const p: Point = { x: e.clientX - rect.left - offset.x, y: e.clientY - rect.top - offset.y };
    if (snapping) return snap(p);
    return p;
  };

  const onPointDown = (e: Event, i: number) => {
    e.stopPropagation();
    setDraggedPoint(i);
    if (i < 0) return;

    setSelectedPoint(i);

    if ((i == 0 && activePoint == geom.points.length - 1) || (i == geom.points.length - 1 && activePoint == 0)) {
      setIsClosed(true);
    }

    if (i == 0 || i == geom.points.length - 1) setActivePoint(i);
  };

  const addPointToGeom = (p: Point, ndx?: number) => {
    if (ndx === undefined) geom.points.push(p);
    else geom.points.splice(ndx, 0, p);
    setGeom({ ...geom });
  };

  const onCanvasClick = (e: MouseEvent) => {
    if (draggedPoint != -1) return;

    const np = getPosition(e);
    if (activePoint == 0) {
      addPointToGeom(np, 0);
      setSelectedPoint(0);
    } else {
      const i = geom.points.length - 1;
      addPointToGeom(np, i);
      setActivePoint(i);
      setSelectedPoint(i);
    }
  };

  const insertPoint = (e: MouseEvent, after: number) => {
    e.stopImmediatePropagation();

    const np = getPosition(e);
    addPointToGeom(np, after + 1);
    setDraggedPoint(after + 1);
    setSelectedPoint(after + 1);
    if (activePoint > 0) setActivePoint(activePoint + 1);
  };

  const removeSelected = () => {
    if (selectedPoint < 0) return;
    if (isClosed) {
      // remove point and reorder all
      const n = [...geom.points.slice(selectedPoint + 1), ...geom.points.slice(0, selectedPoint)];
      setActivePoint(0);
      setSelectedPoint(0);
      setIsClosed(false);
      setGeom({ ...geom, points: n });
      return;
    }

    if (selectedPoint >= geom.points.length) setSelectedPoint(geom.points.length - 1);
  };

  useEffect(() => {
    const keyPress = (ev: KeyboardEvent) => {
      if (ev.key == "Backspace" || ev.key == "Delete") removeSelected();
    };

    window.addEventListener("keydown", keyPress);

    return () => {
      window.removeEventListener("keydown", keyPress);
    };
  }, [selectedPoint, geom]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      //if (draggedPoint == -2) state.setPetioleBase(getPosition(e));
      if (draggedPoint < 0) return;

      geom.points[draggedPoint] = getPosition(e);
      setGeom({ ...geom });
    };

    const stopDrag = () => setTimeout(() => setDraggedPoint(-1), 0);

    if (draggedPoint != -1) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", stopDrag);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [draggedPoint, geom]);

  useEffect(() => {
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();

      setOffset((p) => ({ x: p.x - ev.deltaX, y: p.y - ev.deltaY }));
    };
    /* const onKeyDown = (ev: KeyboardEvent) => {
            if (ev.key == "Shift") setShiftDown((p) => true);
        };
        const onKeyUp = (ev: KeyboardEvent) => {
            if (ev.key == "Shift") setShiftDown((p) => false);
        }; */
    const canvas = document.querySelector("#canvas") as HTMLElement;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    //window.addEventListener("keydown", onKeyDown, { passive: false });
    //window.addEventListener("keyup", onKeyUp, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      //canvas.removeEventListener("keydown", onKeyDown);
      //canvas.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div class="shape-editor">
      <svg id="canvas" onClick={onCanvasClick}>
        <defs>
          <pattern
            id="grid"
            width={gridSnap}
            height={gridSnap}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${-gridSnap / 2}, ${-gridSnap / 2})`}
          >
            <circle cx={gridSnap / 2} cy={gridSnap / 2} r={1} />
          </pattern>
        </defs>

        <g transform={`translate(${offset.x}, ${offset.y})`}>
          <rect x={-offset.x} y={-offset.y} width={`${100}%`} height={`${100}%`} fill="url(#grid)" />
          {/*  <g class="mirror">
                    <line x1="50%" x2="50%" y1="0" y2="100%"></line>
                    <rect x="50%" width="50%" y="0" height="100%"></rect>
                    <text x="50%" y="50%">
                    Mirrored
                    </text>
                    </g> */}

          {isClosed ? <polygon points={pointsString} class="line" /> : <polyline points={pointsString} class="line" />}

          {geom.points?.map((p, i) => {
            if (i == geom.points.length - 1) return;
            const t = geom.points[i + 1];
            return (
              <line
                x1={p.x}
                y1={p.y}
                x2={t.x}
                y2={t.y}
                class={"line-helper"}
                onMouseDown={(e) => insertPoint(e, i)}
              ></line>
            );
          })}

          {geom.points?.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="5"
              class="point"
              data-selected={i == selectedPoint}
              data-active={i == activePoint}
              onMouseDown={(e) => onPointDown(e, i)}
            />
          ))}

          {/*<circle
            cx={frame?.petiole.base[0]}
            cy={frame?.petiole.base[1]}
            r="5"
            class="point petiole-base"
            onMouseDown={(e) => onPointDown(e, -2)}
          ></circle>*/}
        </g>
      </svg>
    </div>
  );
}
