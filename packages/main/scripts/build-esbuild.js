const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs-extra');

(async () => {
  const root = path.resolve(__dirname, '../../../'); // monorepo root
  const mainSrc = path.resolve(__dirname, '../src/main.ts');
  const preloadSrc = path.resolve(__dirname, '../src/preload.ts');
  const outDir = path.resolve(__dirname, '../dist/electron-app');

  // Clean output folder
  fs.emptyDirSync(outDir);

  const commonOptions = {
    bundle: true,
    platform: 'node',
    format: 'cjs',
    sourcemap: true,
    external: ['electron', 'better-sqlite3'],
    logLevel: 'info',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@writing-tools/shared': path.resolve(root, 'packages/shared/src') }
  };

  // Build main process
  await esbuild.build({
    ...commonOptions,
    entryPoints: [mainSrc],
    outfile: path.join(outDir, 'main.js')
  });

  // Build preload script if it exists
  const fsExistsSync = fs.existsSync || fs.accessSync;
  if (fsExistsSync(preloadSrc)) {
    await esbuild.build({
      ...commonOptions,
      entryPoints: [preloadSrc],
      outfile: path.join(outDir, 'preload.js')
    });
  }

  console.log('✅ Electron main & preload bundled with shared code!');
})();
