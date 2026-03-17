import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Optional dev-only plugin. If it's not installed, don't fail builds (e.g. CI/GitHub Pages).
  let devTaggerPlugin: unknown | undefined;
  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      devTaggerPlugin = typeof mod.componentTagger === "function" ? mod.componentTagger() : undefined;
    } catch {
      devTaggerPlugin = undefined;
    }
  }

  return ({
  // GitHub Pages serves this project at /<repo>/, not domain root.
  // Using a relative base makes assets work both locally and on Pages.
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), devTaggerPlugin].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})});
