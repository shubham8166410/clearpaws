import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: [],
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      // anthropic.ts wraps an external API — covered by integration tests, not unit tests
      exclude: ["src/lib/anthropic.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
