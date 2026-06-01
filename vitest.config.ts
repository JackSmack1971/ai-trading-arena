import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    passWithNoTests: true,
    alias: {
      "@arena/core": "F:/ai-trading-arena/packages/core/src/index.ts",
      "@arena/db": "F:/ai-trading-arena/packages/db/src/index.ts",
      "@arena/feeds": "F:/ai-trading-arena/packages/feeds/src/index.ts",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/dist/**", "**/node_modules/**"],
    },
  },
});
