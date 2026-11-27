import { copyFile, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { buildHideCss } from '../src/core/hideCss';

const out = 'dist';

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: ['src/content/main.ts'],
  outfile: `${out}/content.js`,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  minify: false,
});
await writeFile(`${out}/hide.css`, buildHideCss());
await copyFile('manifest.json', `${out}/manifest.json`);
await cp('icons', `${out}/icons`, { recursive: true, filter: (src) => !src.endsWith('.svg') });
console.log('built dist/');
