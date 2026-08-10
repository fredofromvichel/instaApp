// The four families the user can switch a text field to (engine/fonts.ts).
import "@fontsource-variable/archivo";
import "@fontsource-variable/caveat";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/outfit";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root-Element nicht gefunden");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
