import { describe, expect, test } from "bun:test"
import { parse } from "jsonc-parser"
import {
  addPlugins,
  DEFAULT_KIT_SPEC,
  MANAGED_PLUGINS,
  managedBaseNames,
  pluginBaseName,
  removePlugins,
} from "../src/installer/plugins"

const plugins = (text: string): unknown[] => (parse(text) as { plugin?: unknown[] }).plugin ?? []
const ALL = [DEFAULT_KIT_SPEC, ...MANAGED_PLUGINS]

describe("pluginBaseName", () => {
  test("strips npm version, keeps scope", () => {
    expect(pluginBaseName("@mohak34/opencode-notifier@latest")).toBe("@mohak34/opencode-notifier")
    expect(pluginBaseName("opencode-mermaid-renderer@0.0.1")).toBe("opencode-mermaid-renderer")
    expect(pluginBaseName("@datadog/opencode-plugin")).toBe("@datadog/opencode-plugin")
  })
  test("leaves github / path specs intact", () => {
    expect(pluginBaseName("github:igshehata/contextualize")).toBe("github:igshehata/contextualize")
    expect(pluginBaseName("/abs/path")).toBe("/abs/path")
  })
  test("handles the [spec, opts] array form", () => {
    expect(pluginBaseName(["@plannotator/opencode@latest", { workflow: "x" }])).toBe("@plannotator/opencode")
  })
})

describe("addPlugins", () => {
  test("creates plugin array in an empty config", () => {
    const { text, added } = addPlugins("", ALL)
    expect(added).toEqual(ALL)
    expect(plugins(text).map(pluginBaseName)).toEqual(ALL.map((s) => pluginBaseName(s)))
  })

  test("is idempotent and never duplicates by base name", () => {
    const first = addPlugins("{}", ALL).text
    const { text, added } = addPlugins(first, ALL)
    expect(added).toEqual([])
    expect(plugins(text)).toHaveLength(ALL.length)
  })

  test("preserves existing entries (incl. plannotator) and skips already-present", () => {
    const start = `{
  // keep me
  "plugin": [
    ["@plannotator/opencode@latest", { "workflow": "plan-agent" }],
    "@datadog/opencode-plugin"
  ]
}`
    const { text, added } = addPlugins(start, ALL)
    expect(added).not.toContain("@datadog/opencode-plugin")
    expect(text).toContain("// keep me")
    const names = plugins(text).map(pluginBaseName)
    expect(names).toContain("@plannotator/opencode")
    expect(names).toContain("@datadog/opencode-plugin")
    expect(names.filter((n) => n === "@datadog/opencode-plugin")).toHaveLength(1)
    expect(names).toContain("github:igshehata/contextualize")
  })
})

describe("removePlugins", () => {
  test("removes kit-managed entries, keeps unmanaged ones", () => {
    const seeded = addPlugins(`{ "plugin": ["@plannotator/opencode@latest"] }`, ALL).text
    const { text, removed } = removePlugins(seeded, managedBaseNames())
    const names = plugins(text).map(pluginBaseName)
    expect(names).toEqual(["@plannotator/opencode"])
    expect(removed).toContain("github:igshehata/contextualize")
  })

  test("no-op on a config with no plugin array", () => {
    const { text, removed } = removePlugins(`{ "lsp": true }`, managedBaseNames())
    expect(removed).toEqual([])
    expect(text).toContain('"lsp": true')
  })
})
