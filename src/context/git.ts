import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const exec = promisify(execFile)

/** Where the portable, tool-agnostic facts live. The contract other tools mount on. */
export const CONTEXT_DIR = ".agent/context"
const MANIFEST_REL = `${CONTEXT_DIR}/manifest.json`
const SCHEMA = 1

/** Paths whose churn is noise — excluded from the delta `track` reasons about. */
const IGNORE = [
  CONTEXT_DIR, // the engine's own output — never chase our own tail
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  "*.lock",
  "*.lockb",
  "*-lock.json",
  "*.min.js",
  "*.map",
]

interface Manifest {
  watermark: string | null
  schema: number
  updatedAt: string
}

export interface ContextStatus {
  /** Inside a git work tree. */
  repo: boolean
  /** A manifest exists — i.e. `/ctx-init` has run. */
  initialized: boolean
  watermark: string | null
  head: string | null
  /** Raw commit count watermark..HEAD (display only). */
  commits: number
  /** Non-ignored files changed since the watermark — the meaningful delta. */
  changed: string[]
  /** Uncommitted, non-ignored changes are present. */
  dirty: boolean
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 })
  return stdout.trim()
}

const tryGit = (cwd: string, args: string[], fallback = ""): Promise<string> =>
  git(cwd, args).catch(() => fallback)

function ignored(path: string): boolean {
  return IGNORE.some((g) => (g.startsWith("*") ? path.endsWith(g.slice(1)) : path === g || path.startsWith(g + "/")))
}

async function readManifest(cwd: string): Promise<Manifest | null> {
  const p = join(cwd, MANIFEST_REL)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(await readFile(p, "utf8")) as Manifest
  } catch {
    return null
  }
}

/** Point the watermark at a commit (creates the manifest if absent). */
export async function writeManifest(cwd: string, watermark: string): Promise<void> {
  const p = join(cwd, MANIFEST_REL)
  await mkdir(dirname(p), { recursive: true })
  const manifest: Manifest = { watermark, schema: SCHEMA, updatedAt: new Date().toISOString() }
  await writeFile(p, JSON.stringify(manifest, null, 2) + "\n")
}

async function isRepo(cwd: string): Promise<boolean> {
  return (await tryGit(cwd, ["rev-parse", "--is-inside-work-tree"], "")) === "true"
}

/** Where do the facts stand relative to the code? Deterministic — no LLM. */
export async function status(cwd: string): Promise<ContextStatus> {
  const base: ContextStatus = {
    repo: false,
    initialized: false,
    watermark: null,
    head: null,
    commits: 0,
    changed: [],
    dirty: false,
  }
  if (!(await isRepo(cwd))) return base

  const head = (await tryGit(cwd, ["rev-parse", "HEAD"], "")) || null
  const manifest = await readManifest(cwd)
  const watermark = manifest?.watermark ?? null

  let commits = 0
  let changed: string[] = []
  if (watermark && head) {
    commits = Number(await tryGit(cwd, ["rev-list", "--count", `${watermark}..HEAD`], "0")) || 0
    const names = await tryGit(cwd, ["diff", "--name-only", watermark, "HEAD"], "")
    changed = names.split("\n").filter(Boolean).filter((p) => !ignored(p))
  }

  const porcelain = await tryGit(cwd, ["status", "--porcelain"], "")
  const dirty = porcelain
    .split("\n")
    .map((l) => l.slice(3))
    .filter(Boolean)
    .some((p) => !ignored(p))

  return { repo: true, initialized: manifest !== null, watermark, head, commits, changed, dirty }
}

/** The filtered delta since the watermark — only the files that matter, for `track` to read. */
export async function diff(cwd: string, opts: { stat?: boolean } = {}): Promise<string> {
  const st = await status(cwd)
  if (!st.watermark || st.changed.length === 0) return ""
  const flag = opts.stat ? "--stat" : "--unified=3"
  return tryGit(cwd, ["diff", flag, st.watermark, "HEAD", "--", ...st.changed], "")
}

/** Advance the watermark to HEAD and commit the facts as their own `(context)` commit. */
export async function record(cwd: string, summary = "sync"): Promise<{ commit: string | null }> {
  const head = (await tryGit(cwd, ["rev-parse", "HEAD"], "")) || null
  if (!head) return { commit: null } // no commits yet — nothing to anchor to
  await writeManifest(cwd, head)
  // -f: the context dir is meant to be committed even if a global/parent
  // .gitignore excludes `.agent` (common). Only this dir is force-tracked;
  // once tracked, ignore rules no longer apply to it.
  await tryGit(cwd, ["add", "-f", "--", CONTEXT_DIR])
  const staged = await tryGit(cwd, ["diff", "--cached", "--name-only", "--", CONTEXT_DIR], "")
  if (!staged) return { commit: head }
  await git(cwd, ["commit", "-m", `(context) ${summary} → ${head.slice(0, 7)}`, "--", CONTEXT_DIR])
  return { commit: await git(cwd, ["rev-parse", "HEAD"]) }
}
