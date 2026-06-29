import type { Config } from "@opencode-ai/plugin"

/** The resolved opencode config object handed to the v1 `config` hook. */
export type OpencodeConfig = Config

/** A single MCP server definition (local or remote). */
export type McpDef = NonNullable<Config["mcp"]>[string]

/** Per-pattern bash permission decision. */
export type BashPermission = "ask" | "allow" | "deny"

/** A `command-glob -> decision` map, as used by `permission.bash`. */
export type BashRules = Record<string, BashPermission>

/** Domains the kit contributes. Used as keys for the opt-out switch. */
export type Domain = "mcp" | "permissions"

export const DOMAINS: readonly Domain[] = ["mcp", "permissions"] as const
