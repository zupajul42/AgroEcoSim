import { GeomEditor } from "../components/designer/GeomEditor.jsx";
import { state } from "./AppState";

export function GeomEditorPage(props) {
  const id = props?.params?.id;
  if (id) return GeomEditor(props);

  return (
    <div>
      {state.geoms.all().map((g) => (
        <a href={`/leaf/geometry/${g.id}`}>{g.name}</a>
      ))}
    </div>
  );
}
