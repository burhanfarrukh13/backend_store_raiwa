import { build } from 'esbuild';
import { execSync } from 'node:child_process';

console.log('1. Copying public assets...');
execSync('node copy-public.mjs', { stdio: 'inherit' });

console.log('2. Bundling api/dispatcher.js with esbuild...');
await build({
  entryPoints: ['src/dispatcher.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
  },
  outfile: 'api/dispatcher.js',
});

console.log('✓ Dispatcher bundle complete: api/dispatcher.js');
