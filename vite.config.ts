// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// When running the dev server we want to serve the app (repo root).
// For production builds the HTML entry lives in `docs/` so we keep that
// as the build root. This lets `npm run dev` serve the React app while
// `vite build` continues to build the static `docs` site.
export default defineConfig(({ command, mode }) => {
  const isDev = command === "serve";

  return {
    root: isDev ? path.resolve(__dirname) : path.resolve(__dirname, "docs"),
    plugins: [react()],
    base: process.env.VITE_BASE || "/",
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true
    }
  };
});

