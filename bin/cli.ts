#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import {
  addPlugins,
  DEFAULT_KIT_SPEC,
  managedBaseNames,
  MANAGED_PLUGINS,
  removePlugins,
} from "../src/installer/plugins"

const HELP = `contextualize — opencode kit installer

Usage:
  contextualize init      [--config <path>] [--kit <spec>]   Add the kit + bundled plugins to your opencode config
  contextualize remove    [--config <path>] [--kit <spec>]   Remove them again
  contextualize help                                         Show this help

The kit's MCPs, permissions, skills, lsp and CLI allows load at runtime once the
kit plugin is present. This installer only manages the entries that must live in
your config's "plugin" array: the kit itself plus
${MANAGED_PLUGINS.map((p) => "  - " + p).join("\n")}
`

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

function defaultConfigPath(): string {
  const base = process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config")
  const dir = join(base, "opencode")
  const jsonc = join(dir, "opencode.jsonc")
  const json = join(dir, "opencode.json")
  if (existsSync(jsonc)) return jsonc
  if (existsSync(json)) return json
  return json // create json by default
}

function readConfig(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : ""
}

function writeConfig(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text.endsWith("\n") ? text : text + "\n")
}

function main(argv: string[]): number {
  const [cmd, ...rest] = argv
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    process.stdout.write(HELP)
    return 0
  }

  const path = flag(rest, "--config") ?? defaultConfigPath()
  const kitSpec = flag(rest, "--kit") ?? DEFAULT_KIT_SPEC

  if (cmd === "init") {
    const { text, added } = addPlugins(readConfig(path), [kitSpec, ...MANAGED_PLUGINS])
    writeConfig(path, text)
    if (added.length) {
      process.stdout.write(`✓ added to ${path}:\n${added.map((a) => "  + " + a).join("\n")}\n`)
    } else {
      process.stdout.write(`✓ ${path} already up to date — nothing to add\n`)
    }
    process.stdout.write("Restart opencode to load the kit.\n")
    return 0
  }

  if (cmd === "remove" || cmd === "uninstall") {
    if (!existsSync(path)) {
      process.stdout.write(`Nothing to do — ${path} does not exist\n`)
      return 0
    }
    const { text, removed } = removePlugins(readConfig(path), managedBaseNames(kitSpec))
    writeConfig(path, text)
    process.stdout.write(
      removed.length
        ? `✓ removed from ${path}:\n${removed.map((r) => "  - " + r).join("\n")}\n`
        : `✓ nothing of the kit's was present in ${path}\n`,
    )
    return 0
  }

  process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`)
  return 1
}

process.exit(main(process.argv.slice(2)))
