{
  if (typeof globalThis.__filename === "undefined") {
    const { fileURLToPath } = await import("node:url")
    globalThis.__filename = fileURLToPath(import.meta.url)
  }

  if (typeof globalThis.__dirname === "undefined") {
    const { dirname } = await import("node:path")
    globalThis.__dirname = dirname(globalThis.__filename)
  }

  if (typeof globalThis.require === "undefined") {
    const { default: module } = await import("node:module")
    globalThis.require = module.createRequire(import.meta.url)
  }
}

export {}