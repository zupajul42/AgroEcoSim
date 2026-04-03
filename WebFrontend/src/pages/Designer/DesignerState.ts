import { batch, signal } from "@preact/signals";

export type Point = [number, number];
export type Frame = { points: Point[]; active: boolean[] };

function lerp(a: Point, b: Point, d: number): Point {
    return [
        (1 - d) * a[0] + d * b[0], //
        (1 - d) * a[1] + d * b[1],
    ];
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
        this.frames[this.time.value] = { active: [], points: [] };

        const stamps = Object.keys(this.frames).map((k) => +k);
        if (stamps.length == 1) return; // if other frame data return

        // else copy from closest
        const i = Math.max(stamps.indexOf(+this.time.value) - 1, 0);
        console.log(stamps, i);

        const toCopy = this.frames[stamps[i]];
        this.frames[this.time.value].points = [...toCopy.points.map((p) => [...p] as Point)];
        this.frames[this.time.value].active = [...toCopy.active];
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

    private getCurrentFrame(): Frame {
        const t = this.time.value;
        const stamps = Object.keys(this.frames).map((k) => +k);
        if (stamps.length == 0) return { points: [], active: [] };

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
            // handle difference (add/remove between 2)
        }
        const points = pFrame.points.map((_, i) => lerp(pFrame.points[i], nFrame.points[i], d));
        const active = pFrame.active;
        return { points, active };
    }

    // preview
}

const state = new DesignerState();
export default state;
