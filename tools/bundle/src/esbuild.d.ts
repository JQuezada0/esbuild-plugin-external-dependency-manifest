import * as ESBuild from "esbuild";
export type BundleInput = {
    packageName: string;
    entryPointModule: string;
};
export type BundleOutput = {
    esmOutput: ESBuild.BuildResult;
    cjsOutput: ESBuild.BuildResult;
};
export declare function build(input: BundleInput): Promise<BundleOutput>;
