import React from "react";
import { createRoot } from "react-dom/client";
import SchemaUpgradeGate from "./components/SchemaUpgradeGate.jsx";
import { preupgradeStatus } from "./db/preupgrade.js";
import "./index.css";
// The Repaso chalkboard's chalk faces, self-hosted so the PWA keeps them offline. Latin
// subsets only: the app's own text is Spanish/English, which latin covers (í, ñ included).
import "@fontsource/gloria-hallelujah/latin-400.css";
import "@fontsource/caveat/latin-500.css";
import "@fontsource/caveat/latin-700.css";

const root = createRoot(document.getElementById("root"));

async function renderApp() {
  const { default: App } = await import("./App.jsx");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

async function boot() {
  try {
    const status = await preupgradeStatus();
    if (status.unsupported) {
      root.render(<div className="p-6">This notebook was opened by a newer app version. Update the app first.</div>);
      return;
    }
    if (status.needsBackup) {
      root.render(<SchemaUpgradeGate fromVersion={status.version} onContinue={renderApp} />);
      return;
    }
    await renderApp();
  } catch (problem) {
    root.render(
      <div className="p-6">
        The notebook could not be checked safely. Nothing was upgraded. {problem instanceof Error ? problem.message : ""}
      </div>
    );
  }
}

boot();
