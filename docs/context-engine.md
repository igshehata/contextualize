# Context engine — design

A git-native, facts-only project-context system for agents. Brownfield-first: it tells you *what is true now*, derived from the code, instead of asking you to write specs up front.

## Why (vs the alternatives)

| | spec-kit / SDD | Cline memory-bank | **contextualize** |
|---|---|---|---|
| Direction | forward (spec → code) | mutable working memory | **reflective (code → facts)** |
| Source of truth | the spec | a single `activeContext` file | **the code; git is the ledger** |
| Drift | specs rot | goes stale, solo-shaped | **watermark-synced — can't drift** |
| Team / multi-session | — | conflicts, single writer | **committed facts; git is shared memory** |
| Tokens | verbose, always loaded | whole bank every session | **tiny, lazy, opt-in** |

Two principles: **facts not decisions** (the "why" already lives in `git log`/`blame`/PRs — don't duplicate it), and **progressive** (context loads only when you switch to the `develop` agent, then lazily — no always-on latency).

## Layers (engine ⊥ artifacts ⊥ consumers)

```
ENGINE      opencode-native, swappable   →  develop · track · context_* tools · session hook · /ctx-*
ARTIFACTS   portable — THE CONTRACT       →  .agent/context/**  (plain markdown + manifest.json)
CONSUMERS   anything mounts here          →  develop · a human · spec-kit · CI
```
The artifacts are tool-agnostic, so other tools (spec-kit, …) mount by reading the directory.

## On-disk facts

```
.agent/context/
  manifest.json     # { watermark: <commit> } — the one number; managed by context_record
  brief.md          # what this is, why, stack, run        (always loaded)
  map.md            # capability index + path → doc routing (always loaded)
  core/
    architecture.md domain.md invariants.md
  features/<capability>/context.md   # frontmatter paths:[globs] binds code → doc
```
`.agent/context` is force-tracked even under a global `.gitignore` for `.agent` (`record` uses `git add -f`).

## Components — one thing each

- **`develop`** (primary agent): does dev work grounded in facts; reads `brief`+`map`, lazy-loads one feature; delegates upkeep to `track`.
- **`track`** (subagent, cheap): reconciles facts ← git diff, or files a handed-over fact. Facts only.
- **`context_status` / `context_diff` / `context_record`** (tools): the git mechanism — drift, filtered delta, advance+commit watermark. Deterministic, no LLM.
- **session hook**: on `session.created` (skips child sessions via `parentID`), if facts are behind → toast `→ /ctx-sync`. Notify only; sync is opt-in.
- **`/ctx-init` · `/ctx-sync` · `/ctx <fact>`**: bootstrap · reconcile · capture.
- **`context-engineering` skill**: the methodology both agents follow.

## Watermark mechanics

`status` compares `manifest.watermark` to `HEAD`; `changed` = non-ignored files in `watermark..HEAD` (lockfiles, `dist`, generated, and `.agent/context` itself are filtered). `record` writes `watermark = HEAD` and commits the facts as one `(context)` commit — which, being context-only, never re-counts as drift. Merges/pulls move `HEAD` past the watermark automatically, so the next session-start check catches team divergence with no special logic.

## Status (v1)

Built + verified at load: agents/commands/skill/tools register in real opencode; git module integration-tested. Not yet covered: the LLM behavior of `track` end-to-end, and a live TUI toast (the `status()` it depends on is tested). Deferred to v2: `auto` background sync, git-hook trigger, per-area context, `/ctx-export` adapters.
