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
}

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
}: SliderInputProps) {
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

  const range = (extra: HTMLAttributes<HTMLInputElement>) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onInput={(e) => onInput(parseFloat(e.currentTarget.value))}
      onChange={commit}
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
