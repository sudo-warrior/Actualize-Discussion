const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  // Build the bundle with shebang
  await esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/ic',
    banner: {
      js: '#!/usr/bin/env node',
    },
  });

  // Make executable
  fs.chmodSync('dist/ic', 0o755);
  
  console.log('✓ Built dist/ic');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
