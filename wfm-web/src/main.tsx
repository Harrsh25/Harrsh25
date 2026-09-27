import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, MemoryRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

// Hash URLs need a real page address (http:// or file://). Sandboxed previews such as
// about:srcdoc have none, so there we keep navigation in memory instead.
function canUseHashUrls() {
  try {
    const { origin, href } = window.location;
    new URL("/", origin !== "null" ? origin : href);
    return true;
  } catch {
    return false;
  }
}

const Router = canUseHashUrls() ? HashRouter : MemoryRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
