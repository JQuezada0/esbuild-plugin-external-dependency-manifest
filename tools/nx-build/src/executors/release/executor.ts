import type { ExecutorContext } from '@nx/devkit';

export interface BundleExecutorOptions {
  packageName: string
  packageNamePublished: string
}

export default async function releaseExecutor(
  options: BundleExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  console.info(`Publishing ${options.packageName} as ${options.packageNamePublished}`)

  const Path = await import("node:path")

  const Os = await import("node:os")
  const Fs = await import("node:fs/promises")
  const ChildProcess = await import("node:child_process")

  const tmpDir = Path.join(Os.tmpdir(), `release-${options.packageName}`)

  await Fs.mkdir(tmpDir, {
    recursive: true,
  })

  const packagePath = Path.dirname(require.resolve(`${options.packageName}/package.json`))

  await copyDirectoryWithHiddenFiles(packagePath, tmpDir)

  const packageManifestPath = Path.join(tmpDir, "package.json")

  const packageJson = JSON.parse(await Fs.readFile(packageManifestPath, "utf8"))

  packageJson.name = options.packageNamePublished

  await Fs.writeFile(packageManifestPath, JSON.stringify(packageJson, undefined, 2))

  ChildProcess.execSync("npm publish --workspaces=false", {
    stdio: "inherit",
    cwd: tmpDir,
  })

  return {
    success: true
  }
}

async function copyDirectoryWithHiddenFiles(src: string, dest: string) {
  const Fs = await import("node:fs/promises")
  const Path = await import("node:path")

  try {
    const entries = await Fs.readdir(src, { withFileTypes: true });

    await Promise.all(entries.map(async (entry) => {
      const srcPath = Path.join(entry.parentPath, entry.name);
      const destPath = Path.join(dest, entry.name);

      if (entry.isFile() || entry.isDirectory()) {
        await Fs.cp(srcPath, destPath, { recursive: true });
      }
    }))
  } catch (err) {
    console.error('Error copying directory:', err);
  }
}
