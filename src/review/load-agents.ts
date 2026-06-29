import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse as parseYaml } from "yaml"
import type { AgentDef } from "../core/types"

export const AGENT_NAMES = ["build", "plan", "review"] as const
export type AgentName = (typeof AGENT_NAMES)[number]

function splitFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: text.trim() }
  return {
    data: (parseYaml(match[1] ?? "") ?? {}) as Record<string, unknown>,
    body: (match[2] ?? "").trim(),
  }
}

function toAgentDef(text: string): AgentDef {
  const { data, body } = splitFrontmatter(text)
  return { ...(data as Partial<AgentDef>), prompt: body } as AgentDef
}

/**
 * Load the bundled build/plan/review agents from `<pkg>/agents/*.md`. Kept out
 * of the pure core so the file IO + frontmatter parsing stays at the adapter
 * boundary; `applyConfig` just receives the resulting AgentDefs.
 */
export function loadAgents(agentsDir: string): Record<AgentName, AgentDef> {
  const out = {} as Record<AgentName, AgentDef>
  for (const name of AGENT_NAMES) {
    out[name] = toAgentDef(readFileSync(join(agentsDir, `${name}.md`), "utf8"))
  }
  return out
}
