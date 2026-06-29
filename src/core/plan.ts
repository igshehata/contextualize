import { Effect } from "effect"
import type { BashPermission, BashRules, OpencodeConfig, RuntimeContext } from "./types"
import type { Settings } from "./options"
import { mcp } from "./content/mcp"
import { bash } from "./content/permissions"
import { cliPermissions } from "./content/clis"
import { mergeAbsent } from "./merge"

/** What the kit actually contributed to a given config, per domain. */
export interface AppliedPlan {
  readonly mcp: readonly string[]
  readonly permissions: readonly string[]
  readonly clis: readonly string[]
  readonly skills: readonly string[]
  readonly lsp: boolean
}

/** `config.skills` isn't in the published Config type yet, though the runtime reads it. */
type ConfigWithSkills = OpencodeConfig & { skills?: { paths?: string[] } }

/**
 * Merge bash rules into `permission.bash`, add-only. A blanket string policy
 * (e.g. "ask") is a deliberate consumer choice and is left untouched.
 */
const mergeBash = (config: OpencodeConfig, rules: BashRules): readonly string[] => {
  const permission = (config.permission ??= {})
  if (typeof permission.bash === "string") return []
  const bag = (permission.bash ??= {}) as Record<string, BashPermission>
  return mergeAbsent(bag, rules, (key, value) => {
    bag[key] = value
  })
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
  Effect.sync(() => (settings.disabled.has("permissions") ? [] : mergeBash(config, bash)))

const registerClis = (config: OpencodeConfig, settings: Settings): Effect.Effect<readonly string[]> =>
  Effect.sync(() => (settings.disabled.has("clis") ? [] : mergeBash(config, cliPermissions)))

const registerSkills = (
  config: OpencodeConfig,
  settings: Settings,
  ctx: RuntimeContext,
): Effect.Effect<readonly string[]> =>
  Effect.sync(() => {
    if (settings.disabled.has("skills")) return []
    const cfg = config as ConfigWithSkills
    const skills = (cfg.skills ??= {})
    const paths = (skills.paths ??= [])
    if (paths.includes(ctx.skillsDir)) return []
    paths.push(ctx.skillsDir)
    return [ctx.skillsDir]
  })

const registerLsp = (config: OpencodeConfig, settings: Settings): Effect.Effect<boolean> =>
  Effect.sync(() => {
    if (settings.disabled.has("lsp")) return false
    // `lsp: true` is valid at runtime even though the published type narrows it
    // to `false | {...}`, so assign through an untyped view.
    const cfg = config as unknown as Record<string, unknown>
    if (cfg["lsp"] !== undefined) return false
    cfg["lsp"] = true
    return true
  })

/**
 * Effect program that mutates `config` in place — additively and
 * non-destructively — and reports what it contributed. The `yield*`-per-domain
 * shape mirrors the v2 registration model, so migrating to `/v2/effect` is a
 * mechanical swap of each domain body, not a rewrite.
 */
export const applyConfig = (
  config: OpencodeConfig,
  settings: Settings,
  ctx: RuntimeContext,
): Effect.Effect<AppliedPlan> =>
  Effect.gen(function* () {
    const addedMcp = yield* registerMcp(config, settings)
    const addedPermissions = yield* registerPermissions(config, settings)
    const addedClis = yield* registerClis(config, settings)
    const addedSkills = yield* registerSkills(config, settings, ctx)
    const addedLsp = yield* registerLsp(config, settings)
    return {
      mcp: addedMcp,
      permissions: addedPermissions,
      clis: addedClis,
      skills: addedSkills,
      lsp: addedLsp,
    }
  })
