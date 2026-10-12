import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "test" ? undefined : cloudflare()].filter(Boolean) as PluginOption[],
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"]
        }
      },
      {
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          setupFiles: ["tests/setup.ts"]
        }
      }
    ]
  }
}));
