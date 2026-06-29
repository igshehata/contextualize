import type { BashRules } from "../types"

/**
 * Bash permission matrix: read-only / safe commands are auto-allowed, while
 * destructive or history-rewriting commands are denied. Everything else falls
 * through to `*: ask`.
 *
 * Merged key-by-key and never destructively: if the consumer already has a rule
 * for a given pattern, theirs is kept. If they've set `permission.bash` to a
 * blanket string policy, the kit leaves it untouched entirely.
 */
export const bash: BashRules = {
  "*": "ask",

  // --- inspect / read-only: allow ---
  "pwd*": "allow",
  "whoami*": "allow",
  "date*": "allow",
  "uname*": "allow",
  "which*": "allow",
  "env*": "allow",
  "printenv*": "allow",
  "ls*": "allow",
  "rg*": "allow",
  "fd*": "allow",
  "jq*": "allow",
  "yq*": "allow",
  "mise current*": "allow",
  "mise which*": "allow",
  "mise ls*": "allow",
  "mise env*": "allow",
  "git status*": "allow",
  "git diff*": "allow",
  "git log*": "allow",
  "git show*": "allow",
  "git branch*": "allow",
  "git rev-parse*": "allow",
  "git grep*": "allow",
  "docker ps*": "allow",
  "docker images*": "allow",
  "docker logs*": "allow",
  "docker inspect*": "allow",
  "docker compose ps*": "allow",
  "docker compose logs*": "allow",
  "bun test*": "allow",
  "pnpm test*": "allow",
  "bun run lint*": "allow",
  "bun run format*": "allow",
  "bunx prettier*": "allow",
  "bunx eslint*": "allow",
  "bunx biome*": "allow",
  "bunx stylelint*": "allow",
  "kubectl get*": "allow",
  "kubectl describe*": "allow",
  "kubectl logs*": "allow",
  "kubectl exec*": "allow",
  "kubectl port-forward*": "allow",

  // --- destructive / irreversible: deny ---
  "sudo *": "deny",
  "rm *": "deny",
  "rm -rf *": "deny",
  "chmod -R *": "deny",
  "chown -R *": "deny",
  "mkfs*": "deny",
  "diskutil erase*": "deny",
  "dd *": "deny",
  "brew install*": "deny",
  "brew uninstall*": "deny",
  "git clean*": "deny",
  "git commit*": "deny",
  "git push*": "deny",
  "git rebase*": "deny",
  "git reset*": "deny",
  "git merge*": "deny",
  "git cherry-pick*": "deny",
  "git revert*": "deny",
  "git add*": "deny",
  "git checkout*": "deny",
  "git switch*": "deny",
  "git restore*": "deny",
  "docker rm*": "deny",
  "docker rmi*": "deny",
  "docker system prune*": "deny",
  "kubectl apply*": "deny",
}
