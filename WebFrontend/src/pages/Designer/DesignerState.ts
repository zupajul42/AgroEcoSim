import { batch, signal } from "@preact/signals";

export type Point = [number, number];
export type Frame = {
    points: Point[];
    active: boolean[];
    petiole: { base: Point; leafAngle: number; trunkAngle: number; length?: number };
};

function lerp(a: Point, b: Point, d: number): Point {
    return [
        (1 - d) * a[0] + d * b[0], //
        (1 - d) * a[1] + d * b[1],
    ];
}

function lerpF(a: number, b: number, d: number): number {
    return (1 - d) * a + d * b;
}

class DesignerState {
    time = signal<number>(0);
    frame = signal<Frame>();
    frames: { [timestamp: number]: Frame } = {};

    constructor() {
        const unsubscribe = this.time.subscribe(() => {
            if (!this.frame) unsubscribe();
            this.frame.value = this.getCurrentFrame();
        });
    }

    private syncFrame() {
        if (this.frames[this.time.value]) return;
        this.frames[this.time.value] = { active: [], points: [], petiole: { base: [0, 0], leafAngle: 0, trunkAngle: 0 } };

        const stamps = Object.keys(this.frames).map((k) => +k);
        if (stamps.length == 1) return; // if other frame data return

        // else copy from closest
        const i = Math.max(stamps.indexOf(+this.time.value) - 1, 0);
        console.log(stamps, i);

        const toCopy = this.frames[stamps[i]];
        this.frames[this.time.value].points = [...toCopy.points.map((p) => [...p] as Point)];
        this.frames[this.time.value].active = [...toCopy.active];
        this.frames[this.time.value].petiole = {
            base: toCopy.petiole.base,
            leafAngle: toCopy.petiole.leafAngle,
            trunkAngle: toCopy.petiole.trunkAngle,
            length: toCopy.petiole.length || 1,
        };
    }

    public insertPoint(point: Point, index: number) {
        // insert in all frames mark in current
        this.syncFrame();

        for (const t in this.frames) {
            this.frames[t].points.splice(index, 0, point);
            this.frames[t].active.splice(index, 0, +t >= this.time.value);
        }
        this.frame.value = this.getCurrentFrame();
    }

    public removePoint(index: number) {
        // mark in current
        this.syncFrame();

        for (const t in this.frames) {
            if (+t >= this.time.value) {
                this.frames[t].active[index] = false;
            }
        }
        this.frame.value = this.getCurrentFrame();
    }

    public movePoint(point: Point, index: number) {
        this.syncFrame();

        this.frames[this.time.value].points[index] = point;
        this.frame.value = this.getCurrentFrame();
    }

    public setPetioleBase(base: Point) {
        this.syncFrame();

        this.frames[this.time.value].petiole.base = base;
        this.frame.value = this.getCurrentFrame();
    }

    private getCurrentFrame(): Frame {
        const t = this.time.value;
        const stamps = Object.keys(this.frames).map((k) => +k);
        if (stamps.length == 0) return { points: [], active: [], petiole: { base: [0, 0], leafAngle: 0, trunkAngle: 0 } };

        stamps.sort();
        if (this.frames[t]) return { ...this.frames[t] }; // exact frame - no interpolation
        else if (t <= stamps[0]) return { ...this.frames[stamps[0]] }; // no frame below - no interpolation
        else if (t >= stamps[stamps.length - 1]) return { ...this.frames[stamps[stamps.length - 1]] }; // no frame ahead - no interpolation

        // between two - interpolate
        const i = stamps.findIndex((s) => s > t);
        const prev = stamps[i - 1];
        const next = stamps[i];
        const d = (t - prev) / (next - prev);

        const pFrame = this.frames[prev];
        const nFrame = this.frames[next];

        if (nFrame.points.length != pFrame.points.length) {
            // handle difference should not be the case, since you need to insert and remove with the given functions
        }
        const points = pFrame.points.map((_, i) => lerp(pFrame.points[i], nFrame.points[i], d));
        const active = pFrame.active;

        const base = lerp(pFrame.petiole.base, nFrame.petiole.base, d);
        const leafAngle = lerpF(pFrame.petiole.leafAngle, nFrame.petiole.leafAngle, d);
        const trunkAngle = lerpF(pFrame.petiole.trunkAngle, nFrame.petiole.trunkAngle, d);
        const length = lerpF(pFrame.petiole.length || 1, nFrame.petiole.length || 1, d);
        return { points, active, petiole: { base, leafAngle, trunkAngle, length } };
    }

    // preview
}

export function debugInit() {
    state.insertPoint([270, 320], 0); // right
    state.insertPoint([230, 200], 0); // peak
    state.insertPoint([190, 320], 0); // left
    state.insertPoint([230, 350], 0); // trunk

    // TODO: Make petiole values editable in UI
    state.frame.value!.petiole.base = [230, 330];
    state.frame.value!.petiole.leafAngle = 20;
    state.frame.value!.petiole.trunkAngle = 75;
    state.frame.value!.petiole.length = 3;
}

const state = new DesignerState();
export default state;
