import type { Config } from "@opencode-ai/plugin"

/** The resolved opencode config object handed to the v1 `config` hook. */
export type OpencodeConfig = Config

/** A single MCP server definition (local or remote). */
export type McpDef = NonNullable<Config["mcp"]>[string]

/** Per-pattern bash permission decision. */
export type BashPermission = "ask" | "allow" | "deny"

/** A `command-glob -> decision` map, as used by `permission.bash`. */
export type BashRules = Record<string, BashPermission>

/** Domains the kit contributes at runtime. Used as keys for the opt-out switch. */
export type Domain = "mcp" | "permissions" | "clis" | "skills" | "lsp"

export const DOMAINS: readonly Domain[] = ["mcp", "permissions", "clis", "skills", "lsp"] as const

/**
 * Environment-specific values the runtime adapter resolves (from its own install
 * location) and passes into the otherwise pure Effect core.
 */
export interface RuntimeContext {
  /** Absolute path to the plugin's bundled skills directory. */
  readonly skillsDir: string
}
