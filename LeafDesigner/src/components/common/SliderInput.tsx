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
  style = {},
}: SliderInputProps) {
  return (
    <div className={`slider-input stack ${className}`} style={{ gap: "4px", ...style }}>
      <div className="row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {label && <label style={{ fontWeight: 500 }}>{label}</label>}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
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
            style={{
              width: "68px",
              textAlign: "right",
              backgroundColor: "var(--bg-1)",
              color: "var(--fg-0)",
              border: "1px solid var(--bg-3)",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "0.85rem",
            }}
          />
          {unit && <span style={{ fontSize: "0.85rem", opacity: 0.8, minWidth: "14px" }}>{unit}</span>}
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
        style={{ width: "100%", boxSizing: "border-box", margin: "2px 0" }}
      />
    </div>
  );
}
