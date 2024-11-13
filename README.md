# External Dependency Manifest

An esbuild plugin that inspects the list of modules marked as `external` and generates a package.json with strictly the
production dependencies that were resolved during bundling.

[![npm version](https://badge.fury.io/js/esbuild-plugin-external-manifest.svg)](https://badge.fury.io/js/esbuild-plugin-external-manifest)
[![NPM](https://nodei.co/npm/esbuild-plugin-external-manifest.png?mini=true)](https://nodei.co/npm/esbuild-plugin-external-manifest/)

## Example

```typescript
import * as ESBuild from "esbuild"
import * as ExternalManifest from "esbuild-plugin-external-manifest"

const buildResult = await ESBuild.build({
  format: "esm",
  platform: "node",
  target: "ES2022",
  treeShaking: true,
  bundle: true,
  entryPoints: [{
    in: "foo/bar.ts",
    out: "dist/foo"
  }],
  outExtension: {
    ".js": ".mjs"
  },
  external: ["@sentry/serverless"],
  plugins: [
    ExternalManifest.plugin(),
  ]
})

const buildResultWithExternalsPackageJson = buildResult as ExternalManifest.BuildResultWithExternalManifests

if (buildResultWithExternalsPackageJson.custom) {
  const { 
    manifestsByOutputPath, // Record<string, PackageJson>
    manifests, // Array<{ outputPath: string; manifest: PackageJson }>
  } = buildResultWithExternalsPackageJson.custom
}
```
