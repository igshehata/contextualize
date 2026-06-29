import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { applyConfig } from "../src/core/plan"
import { parseSettings } from "../src/core/options"
import { mcp } from "../src/core/content/mcp"
import { bash } from "../src/core/content/permissions"
import { cliPermissions } from "../src/core/content/clis"
import type { OpencodeConfig, RuntimeContext } from "../src/core/types"

const run = <A>(e: Effect.Effect<A>) => Effect.runSync(e)
const settings = (opts?: Record<string, unknown>) => run(parseSettings(opts))
const ctx: RuntimeContext = {
  skillsDir: "/abs/pkg/skills",
  agents: {
    build: { mode: "all", prompt: "build" },
    plan: { mode: "all", prompt: "plan" },
    review: { mode: "subagent", prompt: "review" },
  },
}
const apply = (config: OpencodeConfig, opts?: Record<string, unknown>) =>
  run(applyConfig(config, settings(opts), ctx))

const bashOf = (config: OpencodeConfig) => config.permission?.bash as Record<string, string>

describe("mcp", () => {
  test("injects all kit MCP servers into an empty config", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config)
    expect(applied.mcp).toEqual(Object.keys(mcp))
    expect(config.mcp?.["context7"]).toBeDefined()
  })

  test("never overwrites a consumer's existing MCP server", () => {
    const mine = { type: "remote", url: "https://mine.example/mcp" } as const
    const config: OpencodeConfig = { mcp: { context7: mine } }
    expect(apply(config).mcp).not.toContain("context7")
    expect(config.mcp?.["context7"]).toBe(mine)
  })
})

describe("permissions + clis", () => {
  test("merges the bash matrix and cli allows", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config)
    expect(applied.permissions).toEqual(Object.keys(bash))
    expect(applied.clis).toEqual(Object.keys(cliPermissions))
    expect(bashOf(config)["rm -rf *"]).toBe("deny")
    expect(bashOf(config)["agent-browser*"]).toBe("allow")
  })

  test("keeps a consumer's existing rule for the same pattern", () => {
    const config: OpencodeConfig = { permission: { bash: { "rm -rf *": "allow" } } }
    expect(apply(config).permissions).not.toContain("rm -rf *")
    expect(bashOf(config)["rm -rf *"]).toBe("allow")
  })

  test("leaves a blanket string bash policy untouched", () => {
    const config: OpencodeConfig = { permission: { bash: "ask" } }
    const applied = apply(config)
    expect(applied.permissions).toEqual([])
    expect(applied.clis).toEqual([])
    expect(config.permission?.bash).toBe("ask")
  })
})

describe("skills", () => {
  test("adds the bundled skills dir to config.skills.paths", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config)
    expect(applied.skills).toEqual(["/abs/pkg/skills"])
    expect((config as { skills?: { paths?: string[] } }).skills?.paths).toContain("/abs/pkg/skills")
  })

  test("is idempotent — does not duplicate an already-present path", () => {
    const config = { skills: { paths: ["/abs/pkg/skills"] } } as unknown as OpencodeConfig
    const applied = apply(config)
    expect(applied.skills).toEqual([])
    expect((config as { skills?: { paths?: string[] } }).skills?.paths).toEqual(["/abs/pkg/skills"])
  })
})

describe("lsp", () => {
  test("enables lsp when unset", () => {
    const config: OpencodeConfig = {}
    expect(apply(config).lsp).toBe(true)
    expect((config as { lsp?: unknown }).lsp).toBe(true)
  })

  test("respects an existing lsp value", () => {
    const config = { lsp: false } as unknown as OpencodeConfig
    expect(apply(config).lsp).toBe(false)
    expect((config as { lsp?: unknown }).lsp).toBe(false)
  })
})

describe("context engine", () => {
  test("injects develop + track agents and ctx commands", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config)
    expect(applied.context.agents).toContain("develop")
    expect(applied.context.agents).toContain("track")
    expect(applied.context.commands).toContain("ctx-sync")
    expect(config.agent?.["develop"]?.mode).toBe("primary")
    expect(config.agent?.["track"]?.mode).toBe("subagent")
  })

  test("never overrides a consumer's own agent of the same name", () => {
    const mine = { mode: "primary", prompt: "mine" } as const
    const config: OpencodeConfig = { agent: { develop: mine } }
    const applied = apply(config)
    expect(applied.context.agents).not.toContain("develop")
    expect(config.agent?.["develop"]).toBe(mine)
  })

  test("disable skips agents and commands", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config, { disable: ["context"] })
    expect(applied.context.agents).toEqual([])
    expect(config.agent?.["develop"]).toBeUndefined()
  })
})

describe("dev agents + review", () => {
  test("injects build/plan agents and the review agent + command", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config)
    expect(applied.agents).toEqual(["build", "plan"])
    expect(applied.review.agents).toEqual(["review"])
    expect(applied.review.commands).toContain("review")
    expect(config.agent?.["build"]).toBeDefined()
    expect(config.agent?.["review"]).toBeDefined()
    expect(config.command?.["review"]?.agent).toBe("review")
  })

  test("disabling 'agents' and 'review' skips them", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config, { disable: ["agents", "review"] })
    expect(applied.agents).toEqual([])
    expect(applied.review.agents).toEqual([])
    expect(config.agent?.["build"]).toBeUndefined()
    expect(config.command?.["review"]).toBeUndefined()
  })
})

describe("opt-out", () => {
  test("disable via options skips the named domains only", () => {
    const config: OpencodeConfig = {}
    const applied = apply(config, { disable: ["mcp", "skills", "lsp"] })
    expect(applied.mcp).toEqual([])
    expect(applied.skills).toEqual([])
    expect(applied.lsp).toBe(false)
    expect(applied.permissions.length).toBeGreaterThan(0)
    expect(applied.clis.length).toBeGreaterThan(0)
  })

  test("disable via env list (comma-separated)", () => {
    process.env.CONTEXTUALIZE_DISABLE = "mcp, clis"
    const s = settings()
    delete process.env.CONTEXTUALIZE_DISABLE
    expect(s.disabled.has("mcp")).toBe(true)
    expect(s.disabled.has("clis")).toBe(true)
  })

  test("ignores unknown domains", () => {
    expect(settings({ disable: ["bogus"] }).disabled.size).toBe(0)
  })
})

describe("isolation", () => {
  test("does not mutate unrelated config sections", () => {
    const config: OpencodeConfig = { model: "anthropic/claude-opus-4-8" }
    apply(config)
    expect(config.model).toBe("anthropic/claude-opus-4-8")
  })
})
