import { GeomEditor } from "../components/designer/GeomEditor";

export function GeomEditorPage(props: { id?: string; params?: { id?: string } }) {
  const id = props?.id || props?.params?.id;
  if (!id) return <div>No id</div>;
  return <GeomEditor id={id} />;
}
