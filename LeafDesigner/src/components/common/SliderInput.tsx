export interface SliderInputProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  value: number;
  onInput: (val: number) => void;
  className?: string;
  style?: any;
  inline?: boolean;
}

export function SliderInput({
  label,
  min,
  max,
  step = 0.01,
  unit = "",
  value,
  onInput,
  className = "",
  inline = false,
  style = {},
}: SliderInputProps) {

  if (inline) return (
    <div className={`slider-input ${className}`} style={style}>
      <div className="row">
        {label && <label>{label}</label>}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onInput={(e) => onInput(parseFloat((e.target as HTMLInputElement).value))}
          style={{ flex: 1 }}
        />
        <div>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onInput={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(val)) {
                onInput(val);
              }
            }}
          />
          <span>{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`slider-input stack ${className}`} style={style}>
      <div className="row">
        {label && <label>{label}</label>}
        <div>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onInput={(e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              if (!isNaN(val)) {
                onInput(val);
              }
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        className="full-width"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onInput(parseFloat((e.target as HTMLInputElement).value))}
      />
    </div>
  );
}
