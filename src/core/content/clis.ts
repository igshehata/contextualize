import type { BashRules } from "../types"

/**
 * CLI tools the kit makes first-class for the agent by auto-allowing them in
 * `permission.bash` (they're invoked over Bash). Add a command glob here and the
 * agent can run that CLI without a permission prompt. Merged add-only, so a
 * consumer's existing rule for the same pattern always wins.
 */
export const cliPermissions: BashRules = {
  // Vercel Labs browser-automation CLI for AI agents — https://agent-browser.dev
  "agent-browser*": "allow",
}
