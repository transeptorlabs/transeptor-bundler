/* eslint-disable no-undef */
/* eslint-disable no-console */
import { build } from 'esbuild'
import { rm, cp } from 'fs/promises'

/**
 * Build the project using esbuild.
 */
async function buildProject() {
  await rm('dist', { recursive: true, force: true })
  const pkg = JSON.parse(
    await import('fs/promises').then((fs) =>
      fs.readFile('package.json', 'utf-8'),
    ),
  )
  const externalDeps = Object.keys(pkg.dependencies || {})

  await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    sourcemap: true,
    platform: 'node',
    target: 'node20',
    minify: false,
    logLevel: 'info',
    external: externalDeps,
    outfile: 'dist/index.mjs',
    format: 'esm',
  })
  console.log('Build completed.')

  // Copy tracer.js without bundling
  try {
    await cp('src/sim/tracer.js', 'dist/tracer.js')
    console.log('Copied tracer.js to dist/')
  } catch (err) {
    console.error('Failed to copy tracer.js:', err)
  }
}

buildProject().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
