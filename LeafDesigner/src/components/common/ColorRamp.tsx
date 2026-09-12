import { useRef, useState } from "preact/hooks";
import { ColorStop } from "../../types/leaf";
import { sampleColorRamp } from "../../utils/colorRamp";

export interface ColorRampProps {
  stops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
}

const HANDLE_SIZE = 12;

export function ColorRamp({ stops, onChange }: ColorRampProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [selected, setSelected] = useState(0);

  const sorted = [...stops].sort((a, b) => a.t - b.t);
  const selectedIndex = Math.min(selected, stops.length - 1);
  const selectedStop = stops[selectedIndex];

  const tFromEvent = (e: { clientX: number }) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const updateStop = (index: number, patch: Partial<ColorStop>) => {
    onChange(stops.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handlePointerDown = (index: number) => (e: PointerEvent) => {
    e.stopPropagation();
    setSelected(index);
    dragIndex.current = index;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (dragIndex.current === null) return;
    updateStop(dragIndex.current, { t: tFromEvent(e) });
  };

  const handlePointerUp = () => {
    dragIndex.current = null;
  };

  const addStop = (e: MouseEvent) => {
    const t = tFromEvent(e);
    onChange([...stops, { t, color: sampleColorRamp(stops, t) }]);
    setSelected(stops.length);
  };

  const removeSelected = () => {
    if (stops.length <= 1) return;
    onChange(stops.filter((_, i) => i !== selectedIndex));
    setSelected(0);
  };

  const gradientCss = `linear-gradient(to right, ${sorted
    .map((s) => `${s.color} ${(s.t * 100).toFixed(1)}%`)
    .join(", ")})`;

  return (
    <div class="color-ramp stack">
      <div
        ref={trackRef}
        class="color-ramp-track"
        style={{ background: gradientCss }}
        onDblClick={addStop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="Double-click to add a color stop"
      >
        {stops.map((stop, index) => (
          <div
            key={index}
            class={`color-ramp-handle ${index === selectedIndex ? "selected" : ""}`}
            style={{ left: `calc((100% - ${HANDLE_SIZE}px) * ${stop.t})`, background: stop.color }}
            onPointerDown={handlePointerDown(index)}
          />
        ))}
      </div>
      <div class="row">
        <input
          type="color"
          value={selectedStop?.color ?? "#ffffff"}
          onInput={(e) => updateStop(selectedIndex, { color: (e.target as HTMLInputElement).value })}
        />
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round((selectedStop?.t ?? 0) * 100)}
          onInput={(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            if (!isNaN(val)) updateStop(selectedIndex, { t: Math.max(0, Math.min(100, val)) / 100 });
          }}
        />
        <span>%</span>
        <span style={{ flex: 1 }} />
        <button onClick={removeSelected} disabled={stops.length <= 1} title="Remove this stop">
          ✕
        </button>
      </div>
    </div>
  );
}
