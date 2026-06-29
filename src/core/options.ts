import { Effect } from "effect"
import type { Domain } from "./types"
import { DOMAINS } from "./types"

/** Fully-resolved kit settings derived from plugin options + environment. */
export interface Settings {
  /** Domains the consumer has switched off for this machine/project. */
  readonly disabled: ReadonlySet<Domain>
}

const ENV_DISABLE = "CONTEXTUALIZE_DISABLE"

/** Raw options as passed in the config array: `["contextualize", { disable: [...] }]`. */
export type RawOptions = Readonly<Record<string, unknown>> | undefined

const isDomain = (value: string): value is Domain => (DOMAINS as readonly string[]).includes(value)

const fromList = (value: unknown): Domain[] => {
  const parts =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value.map((v) => String(v))
        : []
  return parts.map((p) => p.trim().toLowerCase()).filter(isDomain)
}

/**
 * Parse settings as an Effect so the boundary stays declarative and future
 * validation can slot in without reshaping callers. Never fails today — unknown
 * input degrades to defaults.
 */
export const parseSettings = (options: RawOptions): Effect.Effect<Settings> =>
  Effect.sync(() => ({
    disabled: new Set<Domain>([
      ...fromList(options?.["disable"]),
      ...fromList(process.env[ENV_DISABLE]),
    ]),
  }))
