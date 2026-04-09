import state from "../../pages/Designer/DesignerState";

export function Timeline() {
    return (
        <div>
            <input type="number" value={0} min={0} onInput={(e) => (state.time.value = (e.target as any)?.value)} />
        </div>
    );
}
