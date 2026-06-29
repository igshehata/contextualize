import { applyEdits, modify, parse } from "jsonc-parser"

/**
 * Community plugins the kit bundles. These cannot be injected at runtime —
 * opencode finishes loading `config.plugin` before plugin `config` hooks run —
 * so the installer adds them to the consumer's actual config file instead.
 * (Deliberately excludes `@plannotator/opencode`.)
 */
export const MANAGED_PLUGINS = [
  "@mohak34/opencode-notifier@latest",
  "opencode-mermaid-renderer@0.0.1",
  "@datadog/opencode-plugin",
] as const

/** How the kit itself is referenced in a consumer's plugin array. */
export const DEFAULT_KIT_SPEC = "github:igshehata/contextualize"

const FORMAT = { tabSize: 2, insertSpaces: true } as const

/** Identity of a plugin entry (string or `[spec, opts]`) without its version. */
export function pluginBaseName(entry: unknown): string | undefined {
  const spec = Array.isArray(entry) ? entry[0] : entry
  if (typeof spec !== "string") return undefined
  // path / github / scheme specs have no npm version suffix to strip
  if (spec.includes(":") || spec.startsWith("/") || spec.startsWith(".") || spec.startsWith("~")) return spec
  const at = spec.lastIndexOf("@")
  return at > 0 ? spec.slice(0, at) : spec
}

function pluginArray(text: string): unknown[] | null {
  const parsed = (parse(text) ?? {}) as { plugin?: unknown }
  return Array.isArray(parsed.plugin) ? parsed.plugin : null
}

/** Add managed specs missing from the `plugin` array, preserving JSONC formatting/comments. */
export function addPlugins(text: string, specs: readonly string[]): { text: string; added: string[] } {
  let out = text.trim() ? text : "{}"
  const existing = pluginArray(out)
  const present = new Set((existing ?? []).map(pluginBaseName).filter((b): b is string => Boolean(b)))
  const toAdd = specs.filter((s) => !present.has(pluginBaseName(s) as string))
  if (toAdd.length === 0) return { text: out, added: [] }

  if (existing === null) {
    out = applyEdits(out, modify(out, ["plugin"], [...toAdd], { formattingOptions: FORMAT }))
  } else {
    let index = existing.length
    for (const spec of toAdd) {
      out = applyEdits(
        out,
        modify(out, ["plugin", index], spec, { formattingOptions: FORMAT, isArrayInsertion: true }),
      )
      index++
    }
  }
  return { text: out, added: [...toAdd] }
}

/** Remove plugin entries whose base name matches any target, preserving formatting. */
export function removePlugins(text: string, baseNames: readonly string[]): { text: string; removed: string[] } {
  let out = text.trim() ? text : "{}"
  const targets = new Set(baseNames)
  const removed: string[] = []
  let arr = pluginArray(out)
  if (!arr) return { text: out, removed }

  // Remove from the end so earlier indices stay valid.
  for (let i = arr.length - 1; i >= 0; i--) {
    const base = pluginBaseName(arr[i])
    if (base && targets.has(base)) {
      out = applyEdits(out, modify(out, ["plugin", i], undefined, { formattingOptions: FORMAT }))
      removed.unshift(base)
      arr = pluginArray(out) ?? []
    }
  }
  return { text: out, removed }
}

/** Base names of everything the installer manages (kit + community plugins). */
export function managedBaseNames(kitSpec = DEFAULT_KIT_SPEC): string[] {
  return [kitSpec, ...MANAGED_PLUGINS].map((s) => pluginBaseName(s) as string)
}
