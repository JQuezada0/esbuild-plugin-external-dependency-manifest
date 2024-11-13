// @ts-nocheck

function resolveModulePath(modulePath: string): string {
  const Url = require("node:url")

  const resolved = require.resolve(modulePath)

  const path = URL.canParse(resolved) ? resolved : Url.pathToFileURL(resolved)

  return path
}

export { resolveModulePath as "import.meta.resolve" }