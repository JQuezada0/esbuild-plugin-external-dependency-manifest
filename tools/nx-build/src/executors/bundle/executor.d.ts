import type { ExecutorContext } from '@nx/devkit';
export interface BundleExecutorOptions {
    package: string;
    entryPointModule: string;
}
export default function bundleExecutor(options: BundleExecutorOptions, context: ExecutorContext): Promise<{
    success: boolean;
}>;
