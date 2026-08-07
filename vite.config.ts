import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base "./" keeps asset paths relative so the static build works on any
// host/subpath (GitHub Pages project sites, Netlify, local file preview).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
