import type { CommandDef } from "../core/types"

/** The /review slash command — runs the shared review workflow via the review agent. */
export const commands = {
  review: {
    description: "Review the current worktree or an explicit branch against develop or another target.",
    agent: "review",
    template: [
      "Run the shared review workflow.",
      "",
      "Start by calling `review_context` with `rawArguments` set to `$ARGUMENTS`.",
      "",
      "Then:",
      "- trust the tool output for normalized branches, mode, and requested features",
      "- abort immediately if the tool reports invalid review setup",
      "- call `review_worktree` with the tool's `mode`, `reviewBranch`, `reviewRef`, and `activeWorktree`",
      "- review only inside the returned `reviewPath`",
      "- load `contextualize`",
      "- load `code-reviewer`",
      "- load `vercel-react-best-practices` only when the tool indicates frontend or React or Next relevance",
      "- produce a structured review report with findings and evidence",
      "",
      "$ARGUMENTS",
    ].join("\n"),
  },
} satisfies Record<string, CommandDef>
