import type { ExecutorContext } from '@nx/devkit';

export interface BundleExecutorOptions {
  package: string
  entryPointModule: string
}

export default async function bundleExecutor(
  options: BundleExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  console.info(`Bundling ${options.entryPointModule} from ${options.package}`)

  const Path = await import("node:path")
  const Fs = await import("node:fs/promises")
  const Bundle = await import("@external-manifest/tools-bundle")

  try {
    const { cjsOutput, esmOutput } = await Bundle.build({
      packageName: options.package,
      entryPointModule: options.entryPointModule,
    })
    
    if (cjsOutput.errors.length || esmOutput.errors.length) {
      const allErrors = [
        ...cjsOutput.errors,
        ...esmOutput.errors
      ]
  
      for (const error of allErrors) {
        console.error(error)
      }
  
      return {
        success: false,
      }
    }
  
    const allFiles = [
      ...(cjsOutput.outputFiles ?? []),
      ...(esmOutput.outputFiles ?? [])
    ]
      
    for (const outputFile of allFiles) {
      await Fs.mkdir(Path.dirname(outputFile.path), {
        recursive: true
      })
      await Fs.writeFile(outputFile.path, outputFile.contents)
    }
  
    return { success: true };
  } catch (error) {
    console.error(error)
  }

  return {
    success: false
  }
}
