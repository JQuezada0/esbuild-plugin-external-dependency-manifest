import type { BuildResult, Plugin } from "esbuild";
import { type PackageJson } from "read-package-up";
export interface BuildResultWithExternalManifests extends BuildResult {
    custom?: {
        manifestsByOutputPath: Record<string, PackageJson>;
        manifests: {
            outputPath: string;
            manifest: PackageJson;
        }[];
    };
}
export type ExternalDependenciesManifestInput = {
    /**
     * Override the filter that's used with ESBuild's `onResolve` function. This affects
     * the import graph that's constructed to determine whether or not a dependency that's
     * been marked as `external` is actually imported, and subsequently added to the final package.json
     */
    filterOverride?: RegExp | undefined;
    /**
     * Override the list of external modules that are considered for inclusion in the
     * final package.json. Defaults to the `external` option passed to ESBuild
     */
    externalsOverride?: string[] | undefined;
    /**
     * Enable or disable this plugin
     */
    enabled?: boolean | undefined;
};
export declare function plugin(userPluginInput?: ExternalDependenciesManifestInput): Plugin;
