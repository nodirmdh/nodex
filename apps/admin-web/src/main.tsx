import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { ToastProvider } from "@nodex/ui";
import { initI18n } from "@nodex/i18n";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);
initI18n();
root.render(
  <React.StrictMode>
    <ToastProvider />
    <App />
  </React.StrictMode>,
);
