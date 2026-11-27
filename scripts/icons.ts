import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('icons/icon.svg');
for (const size of [16, 48, 128]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(`icons/icon-${size}.png`);
}
console.log('icons written');
