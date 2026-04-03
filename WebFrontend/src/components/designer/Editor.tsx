import { useEffect, useMemo, useState } from "preact/hooks";
import state, { Frame, Point } from "../../pages/Designer/DesignerState";
import { useSignal } from "@preact/signals";

export function Editor() {
    const [time, setTime] = useState(0);
    const [frame, setFrame] = useState<Frame>();
    const [points, setPoints] = useState<Point[]>([]);

    const pointsString = useMemo(() => points.map((p) => `${p[0]},${p[1]}`).join(" "), [points]);
    const [activePoint, setActivePoint] = useState<number>(0);
    const [selectedPoint, setSelectedPoint] = useState<number>(-1);
    const [draggedPoint, setDraggedPoint] = useState<number>(-1);
    const [isClosed, setIsClosed] = useState(false);

    const [offset, setOffset] = useState<Point>([0, 0]);
    const [gridSnap, setGridSnap] = useState(10);

    useEffect(() => {
        const unTime = state.time.subscribe(setTime);
        const unFrame = state.frame.subscribe(setFrame);
        return () => {
            unTime();
            unFrame();
        };
    }, []);

    useEffect(() => {
        const frame = state.frame.value;
        if (!frame) return;

        setPoints(frame.points.filter((_, i) => frame.active[i]));
    }, [time, frame]);

    // settings:
    // - grid snap (true/false)
    // - grid size (10x10)
    // - mirror-x (true/false)

    // TODO: (next steps)
    // mirror

    const snap = (p: Point): Point => [Math.round(p[0] / gridSnap) * gridSnap, Math.round(p[1] / gridSnap) * gridSnap];

    const getPosition = (e: MouseEvent, snapping: boolean = true): Point => {
        const svg = document.querySelector("#canvas");
        if (!svg) return [-1, -1];

        const rect = svg.getBoundingClientRect();
        const p: Point = [e.clientX - rect.left - offset[0], e.clientY - rect.top - offset[1]];
        if (snapping) return snap(p);
        return p;
    };

    const onPointDown = (e: Event, i: number) => {
        e.stopPropagation();
        setDraggedPoint(i);
        setSelectedPoint(i);

        if ((i == 0 && activePoint == points.length - 1) || (i == points.length - 1 && activePoint == 0)) {
            setIsClosed(true);
        }

        if (i == 0 || i == points.length - 1) setActivePoint(i);
    };

    const onCanvasClick = (e: MouseEvent) => {
        if (draggedPoint >= 0) return;

        const np = getPosition(e);
        if (activePoint == 0) {
            state.insertPoint(np, 0);
            setSelectedPoint(0);
        } else {
            const i = points.length - 1;
            state.insertPoint(np, i);
            setActivePoint(i);
            setSelectedPoint(i);
        }
    };

    const insertPoint = (e: MouseEvent, after: number) => {
        e.stopImmediatePropagation();

        const np = getPosition(e);
        state.insertPoint(np, after + 1);
        setDraggedPoint(after + 1);
        setSelectedPoint(after + 1);
        if (activePoint > 0) setActivePoint(activePoint + 1);
    };

    const removeSelected = () => {
        if (selectedPoint < 0) return;
        if (isClosed) {
            // remove point and reorder all
            const n = [...points.slice(selectedPoint + 1), ...points.slice(0, selectedPoint)];
            setActivePoint(0);
            setSelectedPoint(0);
            setIsClosed(false);
            setPoints(n);
            return;
        }

        state.removePoint(selectedPoint);
        if (selectedPoint >= points.length) setSelectedPoint(points.length - 1);
    };

    useEffect(() => {
        const keyPress = (ev: KeyboardEvent) => {
            if (ev.key == "Backspace" || ev.key == "Delete") removeSelected();
        };

        window.addEventListener("keydown", keyPress);

        return () => {
            window.removeEventListener("keydown", keyPress);
        };
    }, [selectedPoint, points]);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (draggedPoint < 0) return;

            state.movePoint(getPosition(e), draggedPoint);
        };

        const stopDrag = () => setTimeout(() => setDraggedPoint(-1), 0);

        if (draggedPoint >= 0) {
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", stopDrag);
        }

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", stopDrag);
        };
    }, [draggedPoint, points]);

    useEffect(() => {
        const onWheel = (ev: WheelEvent) => {
            ev.preventDefault();

            setOffset((p) => [p[0] - ev.deltaX, p[1] - ev.deltaY]);
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

                <g transform={`translate(${offset[0]}, ${offset[1]})`}>
                    <rect x={-offset[0]} y={-offset[1]} width={`${100}%`} height={`${100}%`} fill="url(#grid)" />
                    {/*  <g class="mirror">
                    <line x1="50%" x2="50%" y1="0" y2="100%"></line>
                    <rect x="50%" width="50%" y="0" height="100%"></rect>
                    <text x="50%" y="50%">
                    Mirrored
                    </text>
                    </g> */}

                    {isClosed ? <polygon points={pointsString} class="line" /> : <polyline points={pointsString} class="line" />}

                    {points.map((p, i) => {
                        if (i == points.length - 1) return;
                        const t = points[i + 1];
                        return (
                            <line
                                x1={p[0]}
                                y1={p[1]}
                                x2={t[0]}
                                y2={t[1]}
                                class={"line-helper"}
                                onMouseDown={(e) => insertPoint(e, i)}
                            ></line>
                        );
                    })}

                    {points.map(([x, y], i) => (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="5"
                            class="point"
                            data-selected={i == selectedPoint}
                            data-active={i == activePoint}
                            onMouseDown={(e) => onPointDown(e, i)}
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
}
