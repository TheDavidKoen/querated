import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${local("./src")}/` },
      // server-only throws outside the react-server condition; tests exercise server modules directly.
      { find: /^server-only$/, replacement: local("./node_modules/server-only/empty.js") },
      // graphql 16 ships CommonJS and ESM builds without an exports map. Yoga's dependencies load
      // the CommonJS one, so the tests must too, or the schema and executor disagree on realms.
      { find: /^graphql$/, replacement: "graphql/index.js" },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
