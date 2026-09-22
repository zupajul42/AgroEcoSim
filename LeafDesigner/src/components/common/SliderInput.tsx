import { CSSProperties, HTMLAttributes } from "preact";

interface SliderInputProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  value: number;
  onInput: (val: number) => void;
  onChange?: (val: number) => void;
  class?: string;
  style?: CSSProperties;
  inline?: boolean;
  defaultValue?: number;
  log?: boolean; // Slider moves logarithmically between min and max > 0 (input is linear).
}

const LOG_STEPS = 1000;

/** A range slider with a matching number field; double-click the slider to reset. */
export function SliderInput({
  label,
  min,
  max,
  step = 0.01,
  unit = "",
  value,
  onInput,
  onChange,
  class: className = "",
  inline = false,
  style = {},
  defaultValue,
  log = false,
}: SliderInputProps) {
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  const snap = (val: number) => parseFloat((Math.round(val / step) * step).toFixed(decimals));
  // The range input works on a 0..1 position; in log mode that position is the exponent between min and max.
  const toPosition = (val: number) => (log ? Math.log(val / min) / Math.log(max / min) : val);
  const fromPosition = (pos: number) => (log ? snap(min * Math.pow(max / min, pos)) : pos);
  const resetToDefault = () => {
    if (defaultValue === undefined) return;
    onInput(defaultValue);
    onChange?.(defaultValue);
  };
  const resetTitle = defaultValue !== undefined ? `Double-click to reset to ${defaultValue}${unit}` : undefined;
  const commit = (e: Event) => {
    const val = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(val)) onChange?.(val);
  };

  const commitRange = (e: Event) => {
    const val = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(val)) onChange?.(fromPosition(val));
  };

  const range = (extra: HTMLAttributes<HTMLInputElement>) => (
    <input
      type="range"
      min={log ? 0 : min}
      max={log ? 1 : max}
      step={log ? 1 / LOG_STEPS : step}
      value={toPosition(value)}
      onInput={(e) => onInput(fromPosition(parseFloat(e.currentTarget.value)))}
      onChange={commitRange}
      onDblClick={resetToDefault}
      title={resetTitle}
      {...extra}
    />
  );
  const number = (
    <div>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => {
          const val = parseFloat(e.currentTarget.value);
          if (!isNaN(val)) onInput(val);
        }}
        onChange={commit}
      />
      {unit && <span>{unit}</span>}
    </div>
  );

  if (inline) {
    return (
      <div class={`slider-input ${className}`} style={style}>
        <div class="row">
          {label && <label>{label}</label>}
          {range({ style: { flex: 1 } })}
          {number}
        </div>
      </div>
    );
  }
  return (
    <div class={`slider-input stack ${className}`} style={style}>
      <div class="row">
        {label && <label>{label}</label>}
        {number}
      </div>
      {range({ class: "full-width" })}
    </div>
  );
}
