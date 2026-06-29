import { defineConfig } from "tsdown"

export default defineConfig({
  entry: { index: "src/index.ts", cli: "bin/cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: true,
  clean: true,
  sourcemap: true,
  // tsdown auto-externalizes `dependencies` and `peerDependencies` (effect,
  // @opencode-ai/plugin), so we ship a thin, host-compatible module without
  // bundling the runtime. No manual `external` needed.
})
