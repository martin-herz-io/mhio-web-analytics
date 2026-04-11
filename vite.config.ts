import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const packageMetadata = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version?: string };

export default defineConfig({
  root: "frontend",
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(packageMetadata.version || "0.0.0"),
  },
  server: {
    port: 5173,
    proxy: {
      "/health": "http://localhost:3000",
      "/openapi.json": "http://localhost:3000",
      "/docs": "http://localhost:3000",
      "/analyze": "http://localhost:3000",
    },
  },
  build: {
    outDir: "../backend/public/app",
    emptyOutDir: true,
  },
});
