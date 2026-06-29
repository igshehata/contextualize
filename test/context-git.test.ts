import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { CONTEXT_DIR, diff, record, status, writeManifest } from "../src/context/git"

let repo: string
const g = (args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim()

function commit(file: string, content: string, msg: string): string {
  const p = join(repo, file)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
  g(["add", "-A"])
  g(["commit", "-q", "-m", msg])
  return g(["rev-parse", "HEAD"])
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "ctxgit-"))
  g(["init", "-q"])
  g(["config", "user.email", "t@example.com"])
  g(["config", "user.name", "Test"])
  g(["config", "commit.gpgsign", "false"])
  commit("README.md", "# repo\n", "init")
})

afterEach(() => rmSync(repo, { recursive: true, force: true }))

describe("status", () => {
  test("uninitialized before a manifest exists", async () => {
    const st = await status(repo)
    expect(st.repo).toBe(true)
    expect(st.initialized).toBe(false)
    expect(st.changed).toEqual([])
  })

  test("tracks meaningful changes and ignores noise after a watermark is set", async () => {
    const head = g(["rev-parse", "HEAD"])
    await writeManifest(repo, head)
    commit("src/feature.ts", "export const x = 1\n", "feat: add feature")
    commit("bun.lock", "noise\n", "chore: lockfile")

    const st = await status(repo)
    expect(st.initialized).toBe(true)
    expect(st.changed).toContain("src/feature.ts")
    expect(st.changed).not.toContain("bun.lock") // ignored noise
    expect(st.commits).toBe(2)
  })
})

describe("diff", () => {
  test("returns only the filtered delta since the watermark", async () => {
    await writeManifest(repo, g(["rev-parse", "HEAD"]))
    commit("src/feature.ts", "export const x = 1\n", "feat")
    const d = await diff(repo)
    expect(d).toContain("src/feature.ts")
    expect(d).toContain("export const x = 1")
  })
})

describe("record", () => {
  test("advances the watermark and self-commit is not counted as drift", async () => {
    await writeManifest(repo, g(["rev-parse", "HEAD"]))
    commit("src/feature.ts", "export const x = 1\n", "feat")

    // track wrote a fact, then records:
    writeFileSync(join(repo, CONTEXT_DIR, "brief.md"), "# brief\n")
    const { commit: c } = await record(repo)
    expect(c).toBeTruthy()

    const st = await status(repo)
    expect(st.changed).toEqual([]) // the (context) commit only touches .agent/context → filtered out
    expect(g(["log", "-1", "--pretty=%s"])).toContain("(context) sync")
  })
})
