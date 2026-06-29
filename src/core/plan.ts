import { Effect } from "effect"
import type { BashPermission, OpencodeConfig } from "./types"
import type { Settings } from "./options"
import { mcp } from "./content/mcp"
import { bash } from "./content/permissions"
import { mergeAbsent } from "./merge"

/** What the kit actually contributed to a given config, per domain. */
export interface AppliedPlan {
  readonly mcp: readonly string[]
  readonly permissions: readonly string[]
}

const registerMcp = (config: OpencodeConfig, settings: Settings): Effect.Effect<readonly string[]> =>
  Effect.sync(() => {
    if (settings.disabled.has("mcp")) return []
    const bag = (config.mcp ??= {})
    return mergeAbsent(bag, mcp, (key, value) => {
      bag[key] = value
    })
  })

const registerPermissions = (
  config: OpencodeConfig,
  settings: Settings,
): Effect.Effect<readonly string[]> =>
  Effect.sync(() => {
    if (settings.disabled.has("permissions")) return []
    const permission = (config.permission ??= {})

    // A blanket string policy (e.g. "ask") is a deliberate consumer choice —
    // never override it with granular rules.
    if (typeof permission.bash === "string") return []

    const bag = (permission.bash ??= {}) as Record<string, BashPermission>
    return mergeAbsent(bag, bash, (key, value) => {
      bag[key] = value
    })
  })

/**
 * Effect program that mutates `config` in place — additively and
 * non-destructively — and reports what it contributed.
 *
 * The `yield*`-per-domain shape mirrors the v2 registration model
 * (`yield* ctx.integration.transform(...)`), so migrating to `/v2/effect` is a
 * mechanical swap of each domain body, not a rewrite.
 */
export const applyConfig = (config: OpencodeConfig, settings: Settings): Effect.Effect<AppliedPlan> =>
  Effect.gen(function* () {
    const addedMcp = yield* registerMcp(config, settings)
    const addedPermissions = yield* registerPermissions(config, settings)
    return { mcp: addedMcp, permissions: addedPermissions }
  })
