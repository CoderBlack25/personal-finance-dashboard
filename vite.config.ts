import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // The base-ui menu and dialog primitives pull in the positioning and
        // focus-management machinery. Keeping them in their own chunk stops
        // them pushing the app chunk past the size warning and lets the
        // rarely-changing vendor code stay cached across app updates.
        manualChunks(id: string) {
          if (id.includes("node_modules/@base-ui")) {
            return "base-ui";
          }
          if (id.includes("node_modules/floating-ui")) {
            return "base-ui";
          }
          return undefined;
        },
      },
    },
  },
});
