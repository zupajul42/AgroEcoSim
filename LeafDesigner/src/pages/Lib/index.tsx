import { useEffect, useState } from "preact/hooks";
import { Preview } from "../../components/designer/Preview";
import { Leaf } from "../../types/leaf";
import "./style.css";

import { state } from "../AppState";

export function Library() {
  const [leafs, setLeafs] = useState<Leaf[]>([]);

  useEffect(() => {
    setLeafs(state.getLeafLib());
  }, []);

  function newLeaf() {
    state.setSelectedLeaf(state.addToLib(state.createDefaultLeaf()));
    window.location.href = "/leaf";
  }

  function openLeaf(leaf: Leaf) {
    var ndx = leafs.findIndex((l) => l.name == leaf.name);
    if (ndx == -1) ndx = state.addToLib(leaf);
    state.setSelectedLeaf(ndx);

    window.location.href = "/leaf";
  }

  async function readText(file: File) {
    return new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = (ev) => res(ev.target?.result as string);
      reader.onerror = (e) => rej(e);
      reader.readAsText(file);
    });
  }

  async function loadLeaf(ev: any) {
    const files: FileList = ev.target.files;
    const promises = await Promise.allSettled([...files].map((f) => readText(f)));
    for (const p of promises) {
      try {
        if (p.status == "rejected") throw new Error("Couldn't load file!?");

        const leaf = JSON.parse(p.value);
        state.addToLib(leaf);
      } catch (e) {
        console.error(e);
      }
    }
    setLeafs(state.getLeafLib());
  }

  return (
    <div className="library">
      <div>
        <h1>Leafs</h1>
        <label for="configPicker">load config</label>
        <input type="file" id="configPicker" accept=".json" onInput={(e) => loadLeaf(e)} multiple={false} />
      </div>
      <div className="leaf-list">
        {leafs.map((leaf) => (
          <div className="leaf-card" onClick={() => openLeaf(leaf)}>
            <Preview width={"150px"} height={"150px"} leaf={leaf}></Preview>
            <span>{leaf.name}</span>
          </div>
        ))}
        <div className="leaf-card" style={{ width: "150px", height: "175px" }} onClick={() => newLeaf()}>
          <span style={{ fontSize: "3rem" }}>+</span>
          <span>Create New</span>
        </div>
      </div>
    </div>
  );
}
