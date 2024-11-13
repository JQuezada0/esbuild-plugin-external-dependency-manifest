import type { BuildOptions, BuildResult, OnResolveArgs, Plugin, PluginBuild } from "esbuild"
import { readPackageUp, type PackageJson } from "read-package-up"

export interface BuildResultWithExternalManifests extends BuildResult {
  custom?: {
    manifestsByOutputPath: Record<string, PackageJson>;
    manifests: {
      outputPath: string;
      manifest: PackageJson;
    }[]
  }
}

export type ExternalDependenciesManifestInput = {
  /**
   * Override the filter that's used with ESBuild's `onResolve` function. This affects
   * the import graph that's constructed to determine whether or not a dependency that's
   * been marked as `external` is actually imported, and subsequently added to the final package.json
   */
  filterOverride?: RegExp | undefined

  /**
   * Override the list of external modules that are considered for inclusion in the
   * final package.json. Defaults to the `external` option passed to ESBuild
   */
  externalsOverride?: string[] | undefined

  /**
   * Enable or disable this plugin
   */
  enabled?: boolean | undefined
}

export function plugin(userPluginInput: ExternalDependenciesManifestInput = {}): Plugin {
  return {
    name: "external-dependencies-manifest",
    async setup(build) {
      const Path = await import("node:path")

      const pluginOptions = normalizeInput({
        pluginInput: userPluginInput,
        esbuildOptions: build.initialOptions,
      })

      const state = await initializePluginState({
        esbuildOptions: build.initialOptions
      })

      const resolveFilter = pluginOptions.filterOverride
      const externalModules = pluginOptions.externalsOverride

      /**
       * If there aren't any external modules with which to build a package.json, effectively
       * disable the plugin
       */
      if (!externalModules.length) {
        return
      }

      build.onResolve({ filter: resolveFilter }, async (args) => {
        /**
         * Allow ESBuild to run it's normal resolution. If nothing was resolved, then
         * return the result it would have returned
         */
        const resolved = await esbuildResolve(build, args)

        if (!resolved) {
          return resolved
        }

        /**
         * The goal is to build a graph of the modules imported starting at each entry-point.
         * 
         * If a module listed in the `external` list is imported in that graph, then we can:
         * 
         * 1. Find the closest package.json of the module from where it's imported to determine the version number
         * 2. Trace back to which entry-point(s) need that external module, and the package.json of those entry-points.
         * 3. Build a package.json that matches the entry-point's, but with only the prod-dependencies that were found in
         *    the import graph
         */

        // If the path we're resolving was imported by an entry point, save it in the list of imports
        const entryPointsImporting = state.importedToEntryPointMapping.get(args.importer)

        if (entryPointsImporting) {
          // Add the resolved path to the list of imports for the entry point
          state.updateImportedToEntryPointMapping({ key: args.importer, imports: resolved.path, originalEntryPoint: entryPointsImporting.originalEntryPoint })

          // Also add the current path as an "indirect entry-point", because anything that it imports is indirectly imported by the entry point
          state.updateImportedToEntryPointMapping({ key: resolved.path, imports: [], originalEntryPoint: entryPointsImporting.originalEntryPoint })
        }

        /**
         * If the module currently being resolved is in the `external` list, save it in a Map using its specifier as the key,
         * and the resolved path, the importer, and which directory it's being resolved from as the value
         */
        if (externalModules.includes(args.path)) {
          state.externalDependenciesManifest.set(args.path, {
            path: resolved.path,
            importer: args.importer,
            resolveDir: args.resolveDir,
          })
        }

        return resolved
      })

      /**
       * At the end of the build this needs to use the import graph from each entry-point,
       * the map of external modules that were actually resolved and what module(s) resolved them,
       * and figure out the package.json that lists the external as a dependecy to retrieve the
       * version, and the package.json of the entry-point to get reasonable defaults for the package name
       */
      build.onEnd(async (endArgs) => {
        const manifests: Record<string, PackageJson> = {}

        /**
         * For each entry-point and its matching output path
         */
        for (const [entryPoint, outputPath] of Object.entries(state.entryPointsToOutput ?? {})) {
          // Find the package.json of the entry-point
          const packageManifestResult = await readPackageUp({
            cwd: Path.dirname(entryPoint),
            normalize: true,
          })

          if (!packageManifestResult) {
            console.warn(`Unable to find package.json for entry point ${entryPoint}`)
            continue
          }

          const { packageJson: entryPointPackageManifest } = packageManifestResult
          
          // This will represent the dependencies in this entry-point's final package.json
          const deps: Record<string, { path: string; importer: string; manifest: string, version: string, resolveDir: string }> = {}

          /**
           * For each external dependency that was actually resolved during this entry-point's bundling process,
           * find the appropriate version and insert it into the dependency map
           */
          for (const [specifier, { path, importer, resolveDir }] of state.externalDependenciesManifest.entries()) {
            const importedByEntryPoints = state.pathToEntryPointMapping.get(specifier)

            /**
             * This means that the external dependency was resolved, but we don't know 
             * how to get from the specifier to the entry-point(s) that led to its resolution.
             * That likely means the entry-point never imported this external, but some other entry-point
             * did.
             * 
             */
            if (!importedByEntryPoints || !importedByEntryPoints.has(entryPoint)) {
              continue
            }

            /**
             * Find the package.json of the module that imported the external. This means
             * that in order for this plugin to work, the module that imports the external
             * must belong to a package which lists that external as a dependency.
             * 
             * That should be the case anyways, but this could be smarter and try to find
             * the dependency in any ancestor package.json up until the entry-point's package.json,
             * e.g. in the case of workspaces
             */
            const importerManifestResult = await readPackageUp({
              cwd: Path.dirname(importer),
              normalize: true,
            })

            if (!importerManifestResult) {
              console.warn(`Unable to find package.json for importer ${importer} of ${path}`)
              continue
            }

            const { packageJson: importerManifest, path: importerManifestPath } = importerManifestResult

            // Only proceed if we found the external's version in this package.json
            const defInManifest = importerManifest.dependencies?.[specifier]
            if (!defInManifest) {
              continue
            }

            // The golden nugget: save the external and its version, along with the path to the package.json which led to its import
            deps[specifier] = {
              path,
              importer,
              manifest: importerManifestPath,
              version: defInManifest,
              resolveDir,
            }
          }

          // Build the package.json using the output path of the entry-point as the key
          manifests[outputPath] = {
            name: entryPointPackageManifest.name,
            version: entryPointPackageManifest.version,
            dependencies: Object.keys(deps).reduce((acc, key) => {
              acc[key] = deps[key]!.version

              return acc
            }, {} as Record<string, string>),
          }
        }

        /**
         * Not sure if there's another way to pass data back up to the caller, but this seems to work
         */
        const endArgsWithCustom = endArgs as BuildResultWithExternalManifests

        const custom: BuildResultWithExternalManifests["custom"] = {
          manifestsByOutputPath: manifests,
          manifests: Object.entries(manifests).reduce((acc, [outPath, manifest]) => {
            return [
              ...acc,
              {
                outputPath: Path.dirname(outPath),
                manifest,
              }
            ]
          }, [] as { outputPath: string; manifest: PackageJson }[]),
        }

        Object.assign(endArgsWithCustom, { custom })
      })
    },
  }
}

async function esbuildResolve(build: PluginBuild, args: OnResolveArgs) {
  // We need to make sure that esbuild doesn't try to resolve using this plugin recursively
  if ((args.pluginData ?? {}).skipExternalDependenciesManifest) {
    return undefined
  }


  // Fallback to default resolution
  return build.resolve(args.path, {
    importer: args.importer,
    kind: args.kind,
    namespace: args.namespace,
    pluginData: {
      ...(args.pluginData ?? {}),
      skipExternalDependenciesManifest: true,
      specifier: args.path,
      resolveDir: args.resolveDir,
    },
    resolveDir: args.resolveDir,
  })
}

type NormalizeOptionsInput = {
  pluginInput: ExternalDependenciesManifestInput
  esbuildOptions: BuildOptions
}

function normalizeInput(normalizeInput: NormalizeOptionsInput): Required<ExternalDependenciesManifestInput> {
  const defaultFilter = /.*/;
  const defaultExternals = normalizeInput.esbuildOptions.external ?? []
  const defaultEnabled = true

  return {
    ...normalizeInput.pluginInput,
    filterOverride: normalizeInput.pluginInput.filterOverride ?? defaultFilter,
    externalsOverride: normalizeInput.pluginInput.externalsOverride ?? defaultExternals,
    enabled: normalizeInput.pluginInput.enabled ?? defaultEnabled
  }
}

type InitializePluginStateInput = {
  esbuildOptions: BuildOptions
}

async function initializePluginState(input: InitializePluginStateInput) {
  const { esbuildOptions } = input

  const externalDependenciesManifest = new Map<string, { path: string; importer: string, resolveDir: string }>()

  const originalEntryPoints = esbuildOptions.entryPoints ?? {}
  const entryPoints = new Set<string>(Array.isArray(originalEntryPoints) ? originalEntryPoints.reduce((acc, entryPoint) => [
    ...acc,
    typeof entryPoint === "string" ? entryPoint : entryPoint.in,
  ], [] as string[]) : Object.values(originalEntryPoints));

  const entryPointsToOutput = Array.isArray(originalEntryPoints) ? null : Object.entries(originalEntryPoints).reduce((acc, [out, entry]) => {
    acc[entry] = `${out}${esbuildOptions.outExtension?.[".js"] ?? ".js"}`

    return acc
  }, {} as Record<string, string>)

  // Map of imported specifier to entry point, regardless of whether it's a direct or indirect import
  const importedToEntryPointMapping = new Map<string, {
    imports: Set<string>;
    originalEntryPoint: string;
  }>()

  // Map of any unique path to the entry point that imported it
  const pathToEntryPointMapping = new Map<string, Set<string>>()

  const updateImportedToEntryPointMapping = ({ key, imports, originalEntryPoint }: { key: string; imports: string | string[]; originalEntryPoint: string }) => {
    const importsToAdd = Array.isArray(imports) ? imports : [imports]

    const existing = importedToEntryPointMapping.get(key) ?? {
      imports: new Set(),
      originalEntryPoint,
    };

    for (const importToAdd of importsToAdd) {
      existing.imports.add(importToAdd)
    }

    importedToEntryPointMapping.set(key, existing)

    const originalEntryPointSet = pathToEntryPointMapping.get(key) ?? new Set<string>();

    originalEntryPointSet.add(existing.originalEntryPoint)

    pathToEntryPointMapping.set(key, originalEntryPointSet)

    for (const importToAdd of importsToAdd) {
      const originalEntryPointSetOfImportToAdd = pathToEntryPointMapping.get(importToAdd) ?? new Set<string>();

      originalEntryPointSetOfImportToAdd.add(existing.originalEntryPoint)

      pathToEntryPointMapping.set(importToAdd, originalEntryPointSetOfImportToAdd)
    }
  }

  // Initialize the importedToEntryPointMapping with all entry points
  for (const entryPoint of entryPoints) {
    importedToEntryPointMapping.set(entryPoint, {
      imports: new Set(),
      originalEntryPoint: entryPoint,
    })
  }

  return {
    pathToEntryPointMapping,
    externalDependenciesManifest,
    importedToEntryPointMapping,
    entryPointsToOutput,
    updateImportedToEntryPointMapping,
  }
}