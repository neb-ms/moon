import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    assetsInlineLimit: 2048,
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/chunks/[name]-[hash].js",
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.indexOf("/node_modules/") === -1) {
            return;
          }

          if (normalizedId.indexOf("/react-router") !== -1) {
            return "router";
          }

          if (
            normalizedId.indexOf("/react/") !== -1 ||
            normalizedId.indexOf("/react-dom/") !== -1 ||
            normalizedId.indexOf("/scheduler/") !== -1
          ) {
            return "react-core";
          }

          return "vendor";
        },
      },
    },
    target: "es2020",
  },
});
