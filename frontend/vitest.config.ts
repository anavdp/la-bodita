import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
      // CSS stays unprocessed, except where a test reads the stylesheet as text.
      css: { include: [/index\.css\?raw$/] },
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        // Bootstrap and type-only modules have nothing to assert about.
        exclude: ["src/main.tsx", "src/setupTests.ts", "src/**/*.d.ts", "src/**/types.ts"],
        // The repo-wide floor from CLAUDE.md, matched to the backend's.
        thresholds: { lines: 85, functions: 85, branches: 85, statements: 85 },
      },
    },
  }),
);
