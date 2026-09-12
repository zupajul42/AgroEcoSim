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
  const resetToDefault = () => {
    if (defaultMin !== undefined && defaultMax !== undefined) onChange(defaultMin, defaultMax);
  };
  const resetTitle =
    defaultMin !== undefined && defaultMax !== undefined
      ? `Double-click to reset to ${defaultMin}-${defaultMax}${unit}`
      : undefined;

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
              if (!isNaN(val)) onChange(Math.min(val, valueMax), valueMax);
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
              if (!isNaN(val)) onChange(valueMin, Math.max(val, valueMin));
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div class="drs-track" title={resetTitle} onDblClick={resetToDefault}>
        <input
          type="range"
          class="drs-input"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onInput={(e) => onChange(Math.min(parseFloat((e.target as HTMLInputElement).value), valueMax), valueMax)}
        />
        <input
          type="range"
          class="drs-input"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onInput={(e) => onChange(valueMin, Math.max(parseFloat((e.target as HTMLInputElement).value), valueMin))}
        />
      </div>
    </div>
  );
}
