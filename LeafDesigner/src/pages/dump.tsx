const STORAGE_KEYS = ["leafLib", "geomLib", "selectedLeaf"];

export function RecoverStorage({ problem }: { problem: string }) {
  const download = () => {
    const dump = Object.fromEntries(STORAGE_KEYS.map((k) => [k, JSON.parse(window.localStorage.getItem(k))]));

    const url = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "leafdesigner-state.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const clear = () => {
    for (const k of STORAGE_KEYS) window.localStorage.removeItem(k);
    window.location.href = "/";
  };

  return (
    <section style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1>Stored data is incompatible</h1>

      <p>The leaf library saved in this browser can't be loaded by this version of the app:</p>
      <pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{problem}</pre>

      <p>Download a dump of the stored data first if you want to keep it, then clear it to start fresh.</p>
      <p style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={download}>Dump State</button>
        <button onClick={clear}>Clear &amp; Restart</button>
      </p>
    </section>
  );
}
