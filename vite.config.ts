import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5173 },
  optimizeDeps: { force: true },
  build: { target: "es2022", sourcemap: true }
});