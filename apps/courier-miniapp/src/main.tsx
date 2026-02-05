import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./styles.css";
import { ToastProvider } from "@nodex/ui";
import { initI18n } from "@nodex/i18n";

initI18n();
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider />
    <App />
  </React.StrictMode>,
);
