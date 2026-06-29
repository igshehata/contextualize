---
name: contextualize
description: Load the project's factual context from .agent/context to understand what the project is — its architecture, invariants, and the capability relevant to the task. Use before reviewing or working on unfamiliar code, or whenever an agent is told to load project context.
---

# contextualize — load the project facts

The project's facts live under `.agent/context/` (maintained by the contextualize kit). Load them **progressively** — never read everything:

1. Read `.agent/context/brief.md` (what the project is) and `.agent/context/map.md` (capability index + path → doc routing).
2. For the files in scope, use `map.md` to find the relevant capability and read `.agent/context/features/<capability>/context.md`.
3. Always read `.agent/context/core/invariants.md` — the rules that must not break. Read `core/architecture.md` / `core/domain.md` too if the change is cross-cutting.

If `.agent/context/` doesn't exist, fall back to `AGENTS.md` / `README.md` and note that project context hasn't been initialized (suggest `/ctx-init`).

These facts are ground truth for **what is true now** — not history. For the "why", use git (`log`, `blame`, PRs).
