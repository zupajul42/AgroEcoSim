import { batch, signal } from "@preact/signals";

interface Silhouette {
    points: [number, number][];
}

class DesignerState {
    // timeline
    time = signal<number>(0);

    // editor
    silhouettes: { timestamp: number; data: Silhouette }[] = [];

    // preview
}

const state = new DesignerState();
export default state;
