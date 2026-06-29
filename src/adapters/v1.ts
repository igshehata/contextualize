import type { Hooks, Plugin, PluginInput, ToolDefinition } from "@opencode-ai/plugin"
import type { Event } from "@opencode-ai/sdk"
import { Effect } from "effect"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { parseSettings } from "../core/options"
import { applyConfig } from "../core/plan"
import type { AgentDef, RuntimeContext } from "../core/types"
import { contextTools } from "../context/tools"
import { status } from "../context/git"
import { reviewTools } from "../review/tools"
import { loadAgents } from "../review/load-agents"

// The plugin ships skills + agents alongside the build output (`<pkg>/skills`,
// `<pkg>/agents`), siblings of `<pkg>/dist`. Resolve from this module's own
// location so it works whether installed from npm, GitHub, or a local path.
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const skillsDir = resolve(pkgRoot, "skills")
const agentsDir = resolve(pkgRoot, "agents")

let agentsCache: Record<string, AgentDef> | null = null
function bundledAgents(): Record<string, AgentDef> {
  if (!agentsCache) {
    try {
      agentsCache = loadAgents(agentsDir)
    } catch {
      agentsCache = {} // missing/unreadable agents must never break plugin load
    }
  }
  return agentsCache
}

/**
 * On session start, deterministically (git only, no LLM) check whether the
 * project facts are behind the code and, if so, nudge with a toast. Progressive:
 * notify only — syncing is opt-in via /ctx-sync or the `track` agent.
 */
function driftHook(input: PluginInput): NonNullable<Hooks["event"]> {
  return async ({ event }: { event: Event }) => {
    if (event.type !== "session.created") return
    if (event.properties.info.parentID) return // loop guard: skip child/subagent sessions
    const st = await status(input.worktree)
    if (!st.initialized || st.changed.length === 0) return
    try {
      await input.client.tui.showToast({
        body: {
          message: `📋 project context is ${st.changed.length} change(s) behind — run /ctx-sync`,
          variant: "info",
        },
      })
    } catch {
      // notify is best-effort; never break session start
    }
  }
}

/**
 * v1 `server` plugin adapter — the entrypoint opencode (>=1.17) actually loads.
 * Thin: parse settings, run the Effect core for config injection, and wire the
 * runtime hooks (context tools + drift hook, review tools). All real logic lives
 * in `core/`, `context/`, and `review/`.
 */
export const Contextualize: Plugin = async (input, options) => {
  const settings = await Effect.runPromise(parseSettings(options))
  const runtime: RuntimeContext = { skillsDir, agents: bundledAgents() }

  const hooks: Hooks = {
    config: async (config) => {
      await Effect.runPromise(applyConfig(config, settings, runtime))
    },
  }

  const tools: Record<string, ToolDefinition> = {}
  if (!settings.disabled.has("context")) {
    Object.assign(tools, contextTools)
    hooks.event = driftHook(input)
  }
  if (!settings.disabled.has("review")) Object.assign(tools, reviewTools)
  if (Object.keys(tools).length > 0) hooks.tool = tools

  return hooks
}
