import type { ToolDefinition } from "@opencode-ai/plugin"
import { reviewContext } from "./review_context"
import { reviewWorktree } from "./review_worktree"

/** The deterministic review setup tools, keyed by the names the review agent calls. */
export const reviewTools: Record<string, ToolDefinition> = {
  review_context: reviewContext,
  review_worktree: reviewWorktree,
}
