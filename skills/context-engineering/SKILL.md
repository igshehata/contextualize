---
name: context-engineering
description: How to extract and maintain a project's factual context for agents under .agent/context — what to capture, where it goes, and how to keep it true from git. Use when initializing, syncing, or adding to project context (the develop and track agents, /ctx-init, /ctx-sync, /ctx).
---

# context-engineering

Maintain a small, factual, git-synced model of **what this project is** — for agents, not humans. Facts only: what exists now, what it does, what must not break. Never decisions, rationale, or history — that lives in git (`git log`, `blame`, PRs).

## The layout (the contract — keep it tool-agnostic)

```
.agent/context/
  manifest.json     # { watermark, schema } — managed by context_record, do not hand-edit
  brief.md          # 1 page: what this is, why it exists, stack, how to run
  map.md            # capability index + path-glob → doc routing
  core/
    architecture.md # structure, boundaries, layers, data flow
    domain.md       # entities, ubiquitous language
    invariants.md   # rules that must NEVER break + non-obvious constraints
  features/
    <capability>/
      context.md    # what it does, contract/behavior, gotchas
                    # frontmatter: paths: [src/<globs>]  — binds code → this doc
```

## What is a fact (and what is not)

- **Fact (keep):** "Auth issues a 15-min JWT; refresh in `auth/refresh.ts`." "Webhooks must stay idempotent — Stripe retries." "All money is integer cents."
- **Not a fact (drop):** "We chose JWT because…" (decision → git). "Renamed `getUser`→`fetchUser`" (volatile). A file inventory or anything restating code.

Capture the **non-obvious constraint** behind weird code as an invariant/gotcha — that's a fact about a constraint, and it stops an agent from "fixing" something intentional.

## Turning a diff into fact updates

1. `context_status` → is anything meaningful changed? `context_diff` → read the filtered delta.
2. For each changed path, route via `map.md` to its doc (or `core/*` for cross-cutting).
3. Ask of each change: does it add/remove a **capability**, change a **contract/behavior**, or establish/break an **invariant**? If yes, edit that doc. If it's a refactor/rename/format/dependency bump — ignore it.
4. Keep edits surgical and terse. Prefer deleting stale lines over piling on.
5. `context_record` to advance the watermark and commit `(context)`.

## Routing a handed-over fact (`/ctx`)

Place it in the **single** best-fitting doc: a hard rule → `core/invariants.md`; behavior of one capability → that feature's `context.md` gotchas; project-wide → `brief.md`. Then `context_record`.

## Token discipline

`brief.md` and `map.md` are the only always-loaded docs — keep each well under a page. Feature docs are read on demand. If a doc grows past ~1 page, it's probably restating code — cut it back to intent.
