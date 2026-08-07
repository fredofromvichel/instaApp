import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// base "./" keeps asset paths relative so the static build works on any
// host/subpath (GitHub Pages project sites, Netlify, local file preview).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-180.png"],
      manifest: {
        name: "Insta-Studio",
        short_name: "Insta-Studio",
        description:
          "Gestalte schöne Instagram-Posts – ganz einfach auf deinem Handy.",
        lang: "de",
        display: "standalone",
        background_color: "#f7f2ec",
        theme_color: "#f7f2ec",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Fonts are large; raise the precache limit so offline includes them.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  base: "./",
});
