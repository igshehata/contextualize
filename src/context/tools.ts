import { tool } from "@opencode-ai/plugin"
import type { ToolDefinition } from "@opencode-ai/plugin"
import { diff, record, status } from "./git"

/**
 * The git mechanism, exposed to agents as three single-purpose tools. Each does
 * one thing; `track` composes them. They run git in the session's worktree and
 * carry no LLM reasoning of their own.
 */
export const contextTools: Record<string, ToolDefinition> = {
  context_status: tool({
    description:
      "Report whether the project facts in .agent/context are behind the code: watermark vs HEAD, commits behind, the meaningful changed files (noise filtered), and whether the tree is dirty. Deterministic — no reasoning.",
    args: {},
    async execute(_args, ctx) {
      return JSON.stringify(await status(ctx.worktree), null, 2)
    },
  }),

  context_diff: tool({
    description:
      "Return the filtered git diff of meaningful changes since the facts were last synced (the watermark). Read this to learn what actually changed before updating the facts. Pass stat:true for a summary only.",
    args: {
      stat: tool.schema.boolean().optional().describe("Return a --stat summary instead of the full diff"),
    },
    async execute(args, ctx) {
      const out = await diff(ctx.worktree, { stat: args.stat ?? false })
      return out || "(no meaningful changes since the watermark)"
    },
  }),

  context_record: tool({
    description:
      "Advance the watermark to HEAD and commit the updated facts as a single (context) commit. Call this only after you have finished editing .agent/context to reflect the latest code.",
    args: {
      summary: tool.schema.string().optional().describe("Short commit summary, e.g. 'sync' or 'note'"),
    },
    async execute(args, ctx) {
      const { commit } = await record(ctx.worktree, args.summary ?? "sync")
      return commit
        ? `Recorded — watermark advanced; context commit ${commit.slice(0, 7)}.`
        : "Nothing recorded (repository has no commits yet)."
    },
  }),
}
