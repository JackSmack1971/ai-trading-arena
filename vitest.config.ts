import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    passWithNoTests: true,
    alias: {
      "@arena/core": path.join(__dirname, "packages/core/src/index.ts"),
      "@arena/db": path.join(__dirname, "packages/db/src/index.ts"),
      "@arena/feeds": path.join(__dirname, "packages/feeds/src/index.ts"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/dist/**", "**/node_modules/**"],
    },
  },
});
