import { useRef } from "preact/hooks";

interface DoubleRangeSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  class?: string;
  defaultMin?: number;
  defaultMax?: number;
}

type Handle = "min" | "max";

/** One track with two handles; dragging one past the other swaps the ends, equal ends sit side by side. */
export function DoubleRangeSlider({
  label,
  min,
  max,
  step = 0.01,
  unit = "",
  valueMin,
  valueMax,
  onChange,
  class: className = "",
  defaultMin,
  defaultMax,
}: DoubleRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Handle | null>(null);

  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const snap = (v: number) => Math.min(max, Math.max(min, Number((Math.round(v / step) * step).toFixed(decimals))));
  const fraction = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  // Passing the other end swaps the two; landing on it gives both ends the same value.
  const setHandle = (handle: Handle, v: number): Handle => {
    const other = handle === "min" ? valueMax : valueMin;
    const goesAbove = handle === "min" ? v > other : v >= other;
    if (goesAbove) onChange(other, v);
    else onChange(v, other);
    return goesAbove ? "max" : "min";
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return min + ((clientX - rect.left) / rect.width) * (max - min);
  };
  // The nearer handle takes the drag.
  const nearerHandle = (v: number): Handle => (Math.abs(v - valueMin) <= Math.abs(v - valueMax) ? "min" : "max");

  const focusHandle = (which: Handle) => {
    trackRef.current!.querySelectorAll<HTMLElement>(".drs-handle")[which === "min" ? 0 : 1]?.focus();
  };
  // A swap hands the drag over to the other end, so the pointer keeps hold of the thumb it grabbed.
  const drag = (clientX: number) => {
    const next = setHandle(dragging.current!, snap(valueAt(clientX)));
    if (next !== dragging.current) focusHandle(next);
    dragging.current = next;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = nearerHandle(valueAt(e.clientX));
    trackRef.current!.setPointerCapture(e.pointerId);
    focusHandle(dragging.current);
    drag(e.clientX);
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging.current) drag(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const onKeyDown = (handle: Handle) => (e: KeyboardEvent) => {
    const current = handle === "min" ? valueMin : valueMax;
    const delta = e.shiftKey ? step * 10 : step;
    let target: number;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") target = current - delta;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") target = current + delta;
    else if (e.key === "Home") target = min;
    else if (e.key === "End") target = max;
    else return;
    const next = setHandle(handle, snap(target));
    if (next !== handle) focusHandle(next);
    e.preventDefault();
  };

  const canReset = defaultMin !== undefined && defaultMax !== undefined;
  const resetToDefault = () => {
    if (canReset) onChange(defaultMin!, defaultMax!);
  };

  const handle = (which: Handle, value: number) => (
    <div
      class={`drs-handle drs-handle-${which}`}
      role="slider"
      tabIndex={0}
      aria-label={`${label ?? ""} ${which}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onKeyDown={onKeyDown(which)}
    />
  );

  const commitNumber = (which: Handle, value: number) => (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const val = parseFloat(input.value);
    if (isNaN(val)) input.value = String(value);
    else setHandle(which, val);
  };
  const number = (which: Handle, value: number) => (
    <input type="number" step={step} value={value} onChange={commitNumber(which, value)} />
  );

  return (
    <div class={`double-range-slider stack ${className}`}>
      <div class="row">
        {label && <label>{label}</label>}
        <div class="row" style={{ gap: "4px" }}>
          {number("min", valueMin)}
          <span>-</span>
          {number("max", valueMax)}
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div
        ref={trackRef}
        class="drs-track"
        style={{ "--slider-min": fraction(valueMin), "--slider-max": fraction(valueMax) }}
        title={canReset ? `Double-click to reset to ${defaultMin}-${defaultMax}${unit}` : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDblClick={resetToDefault}
      >
        {handle("min", valueMin)}
        {handle("max", valueMax)}
      </div>
    </div>
  );
}
