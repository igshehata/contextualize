# contextualize

A distributable, Effect-native [opencode](https://opencode.ai) plugin that houses a curated agent kit — MCP servers, permission rules, skills, LSP, CLI allowances, and companion plugins — behind a single install.

> Requires **opencode ≥ 1.17.10**.

## Install

Most of the kit loads at runtime once the plugin is in your config, but the **companion plugins must live in your `plugin` array** (opencode loads plugins before plugin hooks run, so they can't be injected at runtime). The installer handles both in one command:

```bash
npx github:igshehata/contextualize init
```

This adds the kit plus its companion plugins to your opencode config (`~/.config/opencode/opencode.json[c]`), JSONC-aware and idempotent — existing entries and comments are preserved. Restart opencode and you're done. `… remove` reverses it; `--config <path>` targets a specific file.

**Manual alternative** (kit only, without the companion plugins):

```jsonc
{ "$schema": "https://opencode.ai/config.json", "plugin": ["github:igshehata/contextualize"] }
```

Pin a version with a tag: `"github:igshehata/contextualize#v0.1.0"`.

## What you get

Loaded **at runtime** by the plugin (in-memory — **no files written to your project**, contributions just appear in the resolved config and TUI):

| Domain | Contributes |
|---|---|
| `mcp` | `context7`, `sequential-thinking`, `figma`, `next-devtools` MCP servers |
| `permissions` | A bash allow/deny matrix — read-only commands allowed, destructive ones denied, rest `ask` |
| `clis` | Auto-allows the [`agent-browser`](https://agent-browser.dev) CLI in `permission.bash` |
| `skills` | Registers the kit's bundled `skills/` dir via `config.skills.paths` (discovered in place) |
| `lsp` | Enables `lsp: true` if you haven't set it |

Added to your **config file** by `init` (because they can't be runtime-injected):

| | Plugins |
|---|---|
| `plugins` | `@mohak34/opencode-notifier`, `opencode-mermaid-renderer`, `@datadog/opencode-plugin` |

Everything is **additive and non-destructive**: the plugin only adds a key when your config doesn't already define it, and the installer never duplicates or clobbers existing plugin entries — so your own config always wins. (`figma`/`next-devtools` are frontend-specific; drop them in `src/core/content/mcp.ts` if unneeded.)

## Opt out

Disable any runtime domain per machine/project, without removing the plugin:

```jsonc
// via plugin options
{ "plugin": [["github:igshehata/contextualize", { "disable": ["mcp", "lsp"] }]] }
```

```bash
# or via environment
export CONTEXTUALIZE_DISABLE="mcp,clis"
```

Valid domains: `mcp`, `permissions`, `clis`, `skills`, `lsp`.

## Development

This repo uses [mise](https://mise.jdx.dev) for a pinned toolchain (`node`, `bun`) and task running.

```bash
mise install        # provision the pinned node + bun
mise run setup      # install deps + wire the local pre-push hook (optional, no CI needed)
mise run check      # lint + typecheck + test + build (the full gate)
mise run verify     # live load-test in a throwaway opencode — asserts the full kit injects
mise run dev        # rebuild on change
mise tasks          # list everything
```

Linting is [oxc](https://oxc.rs) (`oxlint`). `mise run verify` runs `scripts/smoke.sh`, which loads the built plugin into an opencode instance under a disposable `mktemp` home — it never touches your real `~/.local/share/opencode` data.

## Adding to the kit

Content lives as plain data in `src/core/content/` (`mcp.ts`, `permissions.ts`, `clis.ts`) and `skills/`; companion plugins in `src/installer/plugins.ts`. Add an entry and the Effect core / installer picks it up. Because the content is API-agnostic, it ports unchanged to opencode's forthcoming v2 plugin registration model.

## Architecture

```
src/
  index.ts            # package entry → exports the v1 plugin adapter
  adapters/v1.ts      # opencode v1 `server` plugin (loads on 1.17.x); resolves its own skills dir
  core/
    plan.ts           # Effect program: non-destructive config injection (5 domains)
    merge.ts          # add-only-if-absent helpers
    options.ts        # settings from plugin options + env
    content/          # mcp / permissions / clis, as data
  installer/
    plugins.ts        # JSONC-safe add/remove of companion plugins
bin/cli.ts            # `init` / `remove` installer entrypoint
skills/               # bundled skills, registered via config.skills.paths
```

The plugin is authored in [Effect](https://effect.website): all logic is composed as `Effect` values in `core/`, run at the thin v1 adapter boundary. opencode 1.17.x loads v1 `server` plugins; when the host ships the v2 (`define({ id, effect })`) registration API — which can register skills/agents/commands in-memory — only the adapter changes, and the Effect core, content, and installer are reused as-is.

## License

Apache-2.0
