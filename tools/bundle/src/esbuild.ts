import * as ESBuild from "esbuild"

async function findPaths(input: { packageName: string; entryPointModule: string }) {
  const NodeUrl = await import("node:url")
  const NodePath = await import("node:path")

  const packageManifestModule = `${input.packageName}/package.json`
  const entryPointModule = input.entryPointModule.includes(input.packageName) ? input.entryPointModule : `${input.packageName}/${input.entryPointModule}`

  const packageManifestUrl = import.meta.resolve(packageManifestModule)
  const entrypointFileUrl = import.meta.resolve(entryPointModule)

  const packageManifestPath = URL.canParse(packageManifestUrl) ? NodeUrl.fileURLToPath(packageManifestUrl) : packageManifestUrl
  const entrypointFilePath = URL.canParse(entrypointFileUrl) ? NodeUrl.fileURLToPath(entrypointFileUrl) : entrypointFileUrl
  const packageRoot = NodePath.dirname(packageManifestPath)
  const outPath = NodePath.join(packageRoot, "dist")
  const outFileName = NodePath.basename(entrypointFilePath, ".ts")

  return {
    packageManifestPath,
    entrypointFilePath,
    packageRoot,
    outPath,
    outFileName
  }
}

type BuildInput = {
  packageManifestPath: string
  entrypointFilePath: string
  packageRoot: string
  outPath: string
  outFileName: string
}

async function buildESM(input: BuildInput): Promise<ESBuild.BuildResult> {
  const { entrypointFilePath, packageRoot, outFileName, outPath } = input

  return ESBuild.build({
    entryPoints: [{
      in: entrypointFilePath,
      out: outFileName,
    }],
    outExtension: {
      ".js": ".mjs"
    },
    outdir: outPath,
    absWorkingDir: packageRoot,
    format: "esm",
    platform: "node",
    target: "es2022",
    treeShaking: true,
    splitting: true,
    write: false,
  })
}

async function buildCJS(input: BuildInput): Promise<ESBuild.BuildResult> {
  const { entrypointFilePath, packageRoot, outFileName, outPath } = input

  return ESBuild.build({
    entryPoints: [{
      in: entrypointFilePath,
      out: outFileName,
    }],
    outExtension: {
      ".js": ".cjs"
    },
    outdir: outPath,
    absWorkingDir: packageRoot,
    format: "cjs",
    platform: "node",
    target: "es2022",
    metafile: true,
    write: false,
    plugins: [ 
      {
      name: "resolve-transform",
      setup(build) {
        build.onLoad({ filter: /tools\/bundle\/src.*\.ts$/ }, async (args) => {
          // Skip files in `node_modules`
          if (args.path.includes("node_modules")) {
            return;
          }
  
          // Read the file contents
          const Fs = await import("node:fs/promises");
          let contents = await Fs.readFile(args.path, "utf8");
  
          // Transform `import.meta.resolve` to `require.resolve`
          contents = contents.replace(/\bimport\.meta\.resolve\b/g, "require.resolve");
  
          return {
            contents,
            loader: "ts",
          };
        });
      },
    }]
  })
}

export type BundleInput = {
  packageName: string
  entryPointModule: string
}

export type BundleOutput = {
  esmOutput: ESBuild.BuildResult,
  cjsOutput: ESBuild.BuildResult
}

export async function build(input: BundleInput): Promise<BundleOutput> {
  const paths = await findPaths(input)

  const [esmOutput, cjsOutput] = await Promise.all([
    buildESM(paths),
    buildCJS(paths),
  ])

  return {
    esmOutput,
    cjsOutput
  }
}

if (require.main === module) {
  void (async () => {
    const { cjsOutput, esmOutput } = await build({
      packageName: "@external-manifest/tools-bundle",
      entryPointModule: "bundle"
    })

    const Fs = await import("node:fs/promises")
    const Path = await import("node:path")


    await Fs.mkdir(Path.dirname(cjsOutput.outputFiles![0].path), {
      recursive: true,
    })
    await Fs.mkdir(Path.dirname(esmOutput.outputFiles![0].path), {
      recursive: true,
    })

    await Fs.writeFile(cjsOutput.outputFiles![0].path, cjsOutput.outputFiles![0].contents)
    await Fs.writeFile(esmOutput.outputFiles![0].path, esmOutput.outputFiles![0].contents)
  })()
}