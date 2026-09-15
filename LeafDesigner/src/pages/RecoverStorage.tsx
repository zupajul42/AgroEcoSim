import { STORAGE_KEYS } from "./AppState";
import { downloadFile } from "../utils/download";

/** Shown instead of the app when the stored library can't be loaded by this version. */
export function RecoverStorage({ problem }: { problem: string }) {
  const keys = Object.values(STORAGE_KEYS);
  const dump = () => {
    const stored = Object.fromEntries(keys.map((k) => [k, JSON.parse(window.localStorage.getItem(k) ?? "null")]));
    downloadFile("leafdesigner-state.json", JSON.stringify(stored, null, 2));
  };
  const clear = () => {
    for (const k of keys) window.localStorage.removeItem(k);
    window.location.href = "/";
  };

  return (
    <section class="page-notice">
      <h1>Stored data is incompatible</h1>
      <p>The leaf library saved in this browser can't be loaded by this version of the app:</p>
      <pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{problem}</pre>
      <p>Download a dump of the stored data first if you want to keep it, then clear it to start fresh.</p>
      <div class="btn-group">
        <button onClick={dump}>Dump State</button>
        <button onClick={clear}>Clear &amp; Restart</button>
      </div>
    </section>
  );
}
