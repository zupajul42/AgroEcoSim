import { ColorStop } from "../types/leaf";
import { clamp01, lerp } from "./math";

export const DEFAULT_COLOR_RAMP: ColorStop[] = [
  { t: 0, color: "#4e8f2f" },
  { t: 1, color: "#8a6d3b" },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: number[]): string {
  return (
    "#" +
    rgb
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Color at position t (0-1) on the ramp, interpolated between the surrounding stops. */
export function sampleColorRamp(stops: ColorStop[] | undefined, t: number): string {
  const sorted = [...(stops?.length ? stops : DEFAULT_COLOR_RAMP)].sort((a, b) => a.t - b.t);
  const ct = clamp01(t);
  if (ct <= sorted[0].t) return sorted[0].color;
  if (ct >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].color;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (ct >= a.t && ct <= b.t) {
      const localT = (ct - a.t) / (b.t - a.t || 1);
      const from = hexToRgb(a.color);
      const to = hexToRgb(b.color);
      return rgbToHex(from.map((v, k) => lerp(v, to[k], localT)));
    }
  }
  return sorted[sorted.length - 1].color;
}
