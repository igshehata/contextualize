import type { CommandDef } from "../core/types"

/** Slash commands — one trigger each. All route to the `track` agent. */
export const commands = {
  "ctx-init": {
    description: "Extract or scaffold the project's factual context for agents.",
    agent: "track",
    template: [
      "Initialize the project context under .agent/context, following the context-engineering skill.",
      "- If .agent/context already exists, stop and suggest /ctx-sync instead.",
      "- Greenfield (sparse repo): scaffold brief.md, map.md and core/ stubs.",
      "- Brownfield: survey the codebase at intent level and write brief.md, map.md, core/{architecture,domain,invariants}.md, and features/<capability>/context.md for the main capabilities.",
      "Record only facts (no decisions/history). Then call context_record.",
      "",
      "$ARGUMENTS",
    ].join("\n"),
  },
  "ctx-sync": {
    description: "Reconcile the project facts to the latest code (HEAD).",
    agent: "track",
    template: [
      "Reconcile the project facts to HEAD. Use context_status and context_diff to see what changed since the watermark, update only the affected fact docs, then call context_record.",
      "",
      "$ARGUMENTS",
    ].join("\n"),
  },
  ctx: {
    description: "Capture a fact into the project context; it's routed to the right doc.",
    agent: "track",
    template: [
      "Capture this fact into the project context. Place it in the single best-fitting doc (route via map.md), keep it terse, then call context_record:",
      "",
      "$ARGUMENTS",
    ].join("\n"),
  },
} satisfies Record<string, CommandDef>
