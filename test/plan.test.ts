import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { applyConfig } from "../src/core/plan"
import { parseSettings } from "../src/core/options"
import { mcp } from "../src/core/content/mcp"
import { bash } from "../src/core/content/permissions"
import type { OpencodeConfig } from "../src/core/types"

const run = <A>(e: Effect.Effect<A>) => Effect.runSync(e)
const settings = (opts?: Record<string, unknown>) => run(parseSettings(opts))

describe("applyConfig — mcp", () => {
  test("injects all kit MCP servers into an empty config", () => {
    const config: OpencodeConfig = {}
    const applied = run(applyConfig(config, settings()))

    expect(applied.mcp).toEqual(Object.keys(mcp))
    expect(config.mcp?.["context7"]).toBeDefined()
    expect(config.mcp?.["sequential-thinking"]).toBeDefined()
  })

  test("never overwrites a consumer's existing MCP server", () => {
    const mine = { type: "remote", url: "https://mine.example/mcp" } as const
    const config: OpencodeConfig = { mcp: { context7: mine } }

    const applied = run(applyConfig(config, settings()))

    expect(applied.mcp).not.toContain("context7")
    expect(config.mcp?.["context7"]).toBe(mine)
  })
})

describe("applyConfig — permissions", () => {
  test("merges the bash matrix into an empty config", () => {
    const config: OpencodeConfig = {}
    const applied = run(applyConfig(config, settings()))

    expect(applied.permissions).toEqual(Object.keys(bash))
    const merged = config.permission?.bash as Record<string, string>
    expect(merged["rm -rf *"]).toBe("deny")
    expect(merged["git diff*"]).toBe("allow")
  })

  test("keeps a consumer's existing rule for the same pattern", () => {
    const config: OpencodeConfig = { permission: { bash: { "rm -rf *": "allow" } } }

    const applied = run(applyConfig(config, settings()))

    expect(applied.permissions).not.toContain("rm -rf *")
    const merged = config.permission?.bash as Record<string, string>
    expect(merged["rm -rf *"]).toBe("allow")
  })

  test("leaves a blanket string bash policy untouched", () => {
    const config: OpencodeConfig = { permission: { bash: "ask" } }

    const applied = run(applyConfig(config, settings()))

    expect(applied.permissions).toEqual([])
    expect(config.permission?.bash).toBe("ask")
  })
})

describe("opt-out", () => {
  test("disable via options skips a domain", () => {
    const config: OpencodeConfig = {}
    const applied = run(applyConfig(config, settings({ disable: ["mcp"] })))

    expect(applied.mcp).toEqual([])
    expect(config.mcp).toBeUndefined()
    expect(applied.permissions.length).toBeGreaterThan(0)
  })

  test("disable via env list (comma-separated) skips domains", () => {
    process.env.CONTEXTUALIZE_DISABLE = "mcp, permissions"
    const s = settings()
    delete process.env.CONTEXTUALIZE_DISABLE

    expect(s.disabled.has("mcp")).toBe(true)
    expect(s.disabled.has("permissions")).toBe(true)
  })

  test("ignores unknown domains", () => {
    expect(settings({ disable: ["bogus"] }).disabled.size).toBe(0)
  })
})

describe("isolation", () => {
  test("does not mutate sibling config sections", () => {
    const config: OpencodeConfig = { model: "anthropic/claude-opus-4-8", lsp: true }
    run(applyConfig(config, settings()))

    expect(config.model).toBe("anthropic/claude-opus-4-8")
    expect(config.lsp).toBe(true)
  })
})
