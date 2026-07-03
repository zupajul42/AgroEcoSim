import { useState } from "preact/hooks";
import { Preview } from "../../components/designer/Preview";
import { Leaf } from "../../types/leaf";
import "./style.css";
import { Router } from "preact-iso";

export function Library() {
  const [selectedLeaf, setSelectedLeaf] = useState<Leaf | null>(null);

  // TODO: load from local storage
  const leafs: Leaf[] = [
    {
      name: "Chestnut",
      shape: [
        {
          geom: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ], // obovate
          margin: "serrate",
          venation: "palmate",
          folding: "none",
          petiolule: { len: 0, angle: 0, width: 0.5, x: 0, y: 0 },
        },
      ],
      layout: {
        type: "palmate",
        arrangement: "opposite",
        terminalLeaf: true,
      },
      instances: [
        { shape: 0, scale: 10 },
        { shape: 0, scale: 1 },
        { shape: 0, scale: 1 },
        { shape: 0, scale: 1 },
        { shape: 0, scale: 1 },
      ],
      petiole: { len: 3, angle: 0, width: 0.5, x: 0, y: 0 },
    },
  ];

  function openLeaf(leaf: Leaf) {
    setSelectedLeaf(leaf);
  }

  function LeafDetails({ leaf }: { leaf: Leaf }) {
    return (
      <div className="leaf-details" onClick={(e) => e.stopPropagation()}>
        <h1>{leaf.name}</h1>
        <div style={{ backgroundColor: "var(--bg-1)", width: "fit-content", borderRadius: "8px" }}>
          <Preview controls={true} showAxis={true} leaf={leaf}></Preview>
        </div>

        <button>Download Config</button>
        <button>Export mesh</button>
      </div>
    );
  }

  return (
    <div className="library">
      Show creations / Download config / export mesh / create new / load config
      <h1>Leafs</h1>
      <div className="leaf-list">
        {leafs.map((leaf) => (
          <div className="leaf-card" onClick={() => openLeaf(leaf)}>
            <Preview width={"150px"} height={"150px"} leaf={leaf}></Preview>
            <span>{leaf.name}</span>
          </div>
        ))}
        <div className="leaf-card" style={{ width: "150px", height: "175px" }}>
          <a
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
            href="/leaf"
          >
            <span style={{ fontSize: "3rem" }}>+</span>
            <span>Create New</span>
          </a>
        </div>
      </div>
      {selectedLeaf && (
        <div className="popup" onClick={() => setSelectedLeaf(null)}>
          <LeafDetails leaf={selectedLeaf}></LeafDetails>
        </div>
      )}
    </div>
  );
}
