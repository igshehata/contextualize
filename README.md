# contextualize

A distributable, Effect-native [opencode](https://opencode.ai) plugin that houses a curated agent kit — agents, commands, and tools — behind a single install. Add one line to your opencode config and the whole kit comes with it.

> Requires **opencode ≥ 1.17.10**.

## Install

Add the plugin to the `plugin` array in your opencode config (`~/.config/opencode/opencode.json[c]` for all projects, or `.opencode/opencode.json` per project):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["github:igshehata/contextualize"]
}
```

That's it — opencode installs and loads it on next start. (Once published to npm, `"contextualize"` works too.)

To pin a version, use a tag or commit: `"github:igshehata/contextualize#v0.1.0"`.

## What you get

| Domain | Contributes | Notes |
|---|---|---|
| `mcp` | `context7`, `sequential-thinking`, `figma`, `next-devtools` MCP servers | `figma`/`next-devtools` are frontend-specific — drop them in `src/core/content/mcp.ts` if you don't need them. |
| `permissions` | A bash allow/deny matrix — read-only commands auto-allowed, destructive ones denied, everything else `ask`. | Merged rule-by-rule; a blanket string policy is left untouched. |

Everything is injected **in-memory** via opencode's `config` hook — **no files are written** to your project; the contributions simply appear in the resolved config and TUI. It's also **additive and non-destructive**: the plugin only adds a key when your config doesn't already define it, so your own MCP servers and permission rules always win.

> Skills are intentionally **not** shipped here yet: opencode (v1 plugin API) only discovers skills as files on disk, so a plugin can't register one without writing into a project/home dir. They'll be added via the v2 adapter, which registers skills in-memory.

## Opt out

Disable any domain per machine/project, without removing the plugin:

```jsonc
// via plugin options
{ "plugin": [["github:igshehata/contextualize", { "disable": ["mcp"] }]] }
```

```bash
# or via environment
export CONTEXTUALIZE_DISABLE="mcp,permissions"
```

Valid domains: `mcp`, `permissions`.

## Development

This repo uses [mise](https://mise.jdx.dev) for a pinned toolchain (`node`, `bun`) and task running.

```bash
mise install        # provision the pinned node + bun
mise run setup      # install deps + wire the local pre-push hook (optional, no CI needed)
mise run check      # lint + typecheck + test + build (the full gate)
mise run verify     # live load-test: load the built plugin in a throwaway opencode and assert injection
mise run dev        # rebuild on change
mise tasks          # list everything
```

Linting is [oxc](https://oxc.rs) (`oxlint`).

`mise run verify` runs `scripts/smoke.sh`, which loads the built plugin into an opencode instance using a disposable `mktemp` home — it never touches your real `~/.local/share/opencode` data.

## Adding to the kit

Content lives as plain data in `src/core/content/` — `mcp.ts`, `permissions.ts`. Add an entry, and the Effect core picks it up. Because the content is API-agnostic, it ports unchanged to opencode's forthcoming v2 plugin registration model.

## Architecture

```
src/
  index.ts            # package entry → exports the v1 plugin adapter
  adapters/v1.ts      # opencode v1 `server` plugin (loads on 1.17.x today)
  core/
    plan.ts           # Effect program: non-destructive config injection
    merge.ts          # add-only-if-absent helpers
    options.ts        # settings from plugin options + env
    content/          # the kit, as data
```

The plugin is authored in [Effect](https://effect.website): all logic is composed as `Effect` values in `core/`, run at the thin v1 adapter boundary. opencode 1.17.x loads v1 `server` plugins; when the host ships the v2 (`define({ id, effect })`) registration API, only the adapter changes — the Effect core and content are reused as-is.

## License

Apache-2.0
