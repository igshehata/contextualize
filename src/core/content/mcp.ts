import type { McpDef } from "../types"

/**
 * MCP servers the kit contributes. Injected in-memory via the `config` hook —
 * nothing is written to disk; they simply appear in the resolved config and the
 * TUI. The merge step only adds a server when the consumer hasn't already
 * defined one under the same key, so their own MCP config always wins.
 */
export const mcp = {
  // Up-to-date library/framework docs. Broadly useful.
  context7: {
    type: "remote",
    url: "https://mcp.context7.com/mcp",
  },
  // Structured step-by-step reasoning.
  "sequential-thinking": {
    type: "local",
    command: ["npx", "-y", "@modelcontextprotocol/server-sequential-thinking"],
    enabled: true,
  },
  // Frontend-specific — drop these two if your team isn't on Figma / Next.js.
  figma: {
    type: "remote",
    url: "https://mcp.figma.com/mcp",
    enabled: true,
  },
  "next-devtools": {
    type: "local",
    command: ["npx", "-y", "next-devtools-mcp@latest"],
    enabled: true,
  },
} satisfies Record<string, McpDef>
