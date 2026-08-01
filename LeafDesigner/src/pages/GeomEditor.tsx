import { GeomEditor } from "../components/designer/GeomEditor";
import { state } from "./AppState";

export function GeomEditorPage(props: { id?: string; params?: { id?: string } }) {
  const id = props?.id || props?.params?.id;
  if (id) return <GeomEditor id={id} />;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Leaf Geometries</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "1rem" }}>
        {state.geoms.all().map((g) => (
          <a key={g.id} href={`/leaf/geometry/${g.id}`} style={{ color: "var(--accent)", fontSize: "1.1rem" }}>
            {g.name} ({g.points.length} points)
          </a>
        ))}
      </div>
    </div>
  );
}

