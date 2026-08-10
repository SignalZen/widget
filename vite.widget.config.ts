/**
 * Standalone Vite config for building the embeddable widget bundle.
 *
 *   npm run build:widget        →  production build  →  public/signalzen.js
 *   npm run build:widget:dev    →  development build with watch  →  public/signalzen.js
 *
 * Environment variables are loaded from .env.production / .env.development
 * depending on the --mode flag. All VITE_* vars are inlined at build time.
 *
 * Standalone widget bundle — no TanStack Start / SSR / routing involved.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    outDir: "public",
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: mode !== "production",
    watch: mode !== "production" ? {} : null,
    lib: {
      entry: resolve(import.meta.dirname, "src/widget/embed.tsx"),
      name: "SignalZenBundle",
      formats: ["iife"],
      fileName: () => "signalzen.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        globals: {},
      },
    },
  },
}));
