import type { Plugin } from "@opencode-ai/plugin"
import { Effect } from "effect"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { parseSettings } from "../core/options"
import { applyConfig } from "../core/plan"
import type { RuntimeContext } from "../core/types"

// The plugin ships its skills alongside the build output: `<pkg>/skills`,
// sibling of `<pkg>/dist`. Resolve it from this module's own location so it
// works whether installed from npm, GitHub, or a local path.
const skillsDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "skills")

const runtime: RuntimeContext = { skillsDir }

/**
 * v1 `server` plugin adapter — the entrypoint opencode (>=1.17) actually loads
 * today. It is intentionally thin: parse settings, then run the Effect core at
 * the boundary. All real logic lives in `core/` as API-agnostic Effect programs,
 * so the eventual v2 adapter (`define({ id, effect })`) reuses it unchanged.
 */
export const Contextualize: Plugin = async (_input, options) => {
  const settings = await Effect.runPromise(parseSettings(options))

  return {
    config: async (config) => {
      await Effect.runPromise(applyConfig(config, settings, runtime))
    },
  }
}
