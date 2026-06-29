// Package entrypoint. opencode resolves the `server` plugin kind to the package
// main and loads the exported plugin function. Keep this file exporting only the
// plugin value so the host's plugin discovery stays unambiguous.
export { Contextualize } from "./adapters/v1"
