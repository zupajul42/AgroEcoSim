import { useRef } from "preact/hooks";

export interface DoubleRangeSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  className?: string;
  defaultMin?: number;
  defaultMax?: number;
}

export function DoubleRangeSlider({
  label,
  min,
  max,
  step = 0.01,
  unit = "",
  valueMin,
  valueMax,
  onChange,
  className = "",
  defaultMin,
  defaultMax,
}: DoubleRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const snap = (v: number) => Math.min(max, Math.max(min, Number((Math.round(v / step) * step).toFixed(decimals))));
  const percent = (v: number) => ((v - min) / (max - min)) * 100;
  const setHandle = (handle: "min" | "max", v: number) => {
    if (handle === "min") onChange(Math.min(snap(v), valueMax), valueMax);
    else onChange(valueMin, Math.max(snap(v), valueMin));
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return min + ((clientX - rect.left) / rect.width) * (max - min);
  };
  // The nearer handle takes the drag; when both sit on the same spot, the side you grab decides.
  const nearerHandle = (v: number): "min" | "max" => {
    const dMin = Math.abs(v - valueMin);
    const dMax = Math.abs(v - valueMax);
    if (dMin !== dMax) return dMin < dMax ? "min" : "max";
    return v < valueMin ? "min" : "max";
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const v = valueAt(e.clientX);
    dragging.current = nearerHandle(v);
    trackRef.current!.setPointerCapture(e.pointerId);
    trackRef.current!.querySelectorAll<HTMLElement>(".drs-handle")[dragging.current === "min" ? 0 : 1]?.focus();
    setHandle(dragging.current, v);
    e.preventDefault();
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging.current) setHandle(dragging.current, valueAt(e.clientX));
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const onKeyDown = (handle: "min" | "max") => (e: KeyboardEvent) => {
    const current = handle === "min" ? valueMin : valueMax;
    const delta = e.shiftKey ? step * 10 : step;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") setHandle(handle, current - delta);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") setHandle(handle, current + delta);
    else if (e.key === "Home") setHandle(handle, min);
    else if (e.key === "End") setHandle(handle, max);
    else return;
    e.preventDefault();
  };

  const canReset = defaultMin !== undefined && defaultMax !== undefined;
  const resetToDefault = () => {
    if (canReset) onChange(defaultMin!, defaultMax!);
  };

  const handle = (which: "min" | "max", value: number) => (
    <div
      class="drs-handle"
      role="slider"
      tabIndex={0}
      aria-label={`${label ?? ""} ${which}`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      style={{ left: `${percent(value)}%` }}
      onKeyDown={onKeyDown(which)}
    />
  );

  return (
    <div className={`double-range-slider stack ${className}`}>
      <div className="row">
        {label && <label>{label}</label>}
        <div class="row" style={{ gap: "4px" }}>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={valueMin}
            onInput={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(val)) setHandle("min", val);
            }}
          />
          <span>-</span>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={valueMax}
            onInput={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(val)) setHandle("max", val);
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div
        ref={trackRef}
        class="drs-track"
        title={canReset ? `Double-click to reset to ${defaultMin}-${defaultMax}${unit}` : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDblClick={resetToDefault}
      >
        <div class="drs-rail" />
        <div class="drs-fill" style={{ left: `${percent(valueMin)}%`, width: `${percent(valueMax) - percent(valueMin)}%` }} />
        {handle("min", valueMin)}
        {handle("max", valueMax)}
      </div>
    </div>
  );
}
