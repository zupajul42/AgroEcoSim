import { ColorStop } from "../types/leaf";

// Default ramp for a freshly created leaf
export const DEFAULT_COLOR_RAMP: ColorStop[] = [
  { t: 0, color: "#4e8f2f" },
  { t: 1, color: "#8a6d3b" },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function sampleColorRamp(stops: ColorStop[] | undefined, t: number): string {
  const sorted = [...(stops && stops.length > 0 ? stops : DEFAULT_COLOR_RAMP)].sort((a, b) => a.t - b.t);
  const clampedT = Math.max(0, Math.min(1, t));
  if (clampedT <= sorted[0].t) return sorted[0].color;
  if (clampedT >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (clampedT >= a.t && clampedT <= b.t) {
      const localT = (clampedT - a.t) / (b.t - a.t || 1);
      const [r1, g1, b1] = hexToRgb(a.color);
      const [r2, g2, b2] = hexToRgb(b.color);
      return rgbToHex(r1 + (r2 - r1) * localT, g1 + (g2 - g1) * localT, b1 + (b2 - b1) * localT);
    }
  }
  return sorted[sorted.length - 1].color;
}
