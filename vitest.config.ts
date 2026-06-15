import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Default to the lightweight node environment for pure-logic tests.
    // Component tests opt into jsdom via a `// @vitest-environment jsdom` docblock.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Provide a deterministic secret so share-token tests are independent of the
    // local .env and forward-compatible with the "secret is required" hardening.
    env: {
      SHARE_LINK_SECRET: "test-share-secret",
    },
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
