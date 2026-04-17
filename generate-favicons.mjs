import fs from 'fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="120 10 160 160">
  <defs>
    <clipPath id="circleClip">
      <circle cx="200" cy="90" r="76" />
    </clipPath>
  </defs>
  <path d="M 146 144 A 76 76 0 1 1 254 144" fill="none" stroke="#000000" stroke-width="8" stroke-linecap="square" />
  <g clip-path="url(#circleClip)">
    <path d="M 100 120 L 150 120 C 165 120, 165 95, 180 95 L 205 95 C 220 95, 220 75, 235 75 L 300 75 L 300 60 L 200 10 L 100 60 Z" fill="#ED1C24" />
    <rect x="235" y="15" width="15" height="40" fill="#ED1C24" />
    <path d="M 100 145 L 155 145 C 175 145, 175 115, 195 115 L 215 115 C 230 115, 230 95, 245 95 L 300 95 L 300 200 L 100 200 Z" fill="#000000" />
  </g>
</svg>`;

const whiteSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="120 10 160 160">
  <defs>
    <clipPath id="circleClip">
      <circle cx="200" cy="90" r="76" />
    </clipPath>
  </defs>
  <path d="M 146 144 A 76 76 0 1 1 254 144" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="square" />
  <g clip-path="url(#circleClip)">
    <path d="M 100 120 L 150 120 C 165 120, 165 95, 180 95 L 205 95 C 220 95, 220 75, 235 75 L 300 75 L 300 60 L 200 10 L 100 60 Z" fill="#ED1C24" />
    <rect x="235" y="15" width="15" height="40" fill="#ED1C24" />
    <path d="M 100 145 L 155 145 C 175 145, 175 115, 195 115 L 215 115 C 230 115, 230 95, 245 95 L 300 95 L 300 200 L 100 200 Z" fill="#FFFFFF" />
  </g>
</svg>`;

const outDir = path.join(__dirname, 'public');

fs.writeFileSync(path.join(outDir, 'favicon.svg'), svgContent);

(async () => {
  try {
    const baseSvg = Buffer.from(svgContent);
    const whiteSvg = Buffer.from(whiteSvgContent);

    await sharp(whiteSvg, { density: 300 })
      .resize(180, 180)
      .flatten({ background: '#002045' })
      .toFile(path.join(outDir, 'apple-touch-icon.png'));

    await sharp(baseSvg, { density: 300 })
      .resize(192, 192)
      .toFile(path.join(outDir, 'favicon-192.png'));

    await sharp(baseSvg, { density: 300 })
      .resize(512, 512)
      .toFile(path.join(outDir, 'favicon-512.png'));

    await sharp(baseSvg, { density: 300 })
      .resize(16, 16)
      .toFile(path.join(outDir, 'favicon-16.png'));
      
    await sharp(baseSvg, { density: 300 })
      .resize(32, 32)
      .toFile(path.join(outDir, 'favicon-32.png'));

    const buf = await pngToIco([path.join(outDir, 'favicon-16.png'), path.join(outDir, 'favicon-32.png')]);
    fs.writeFileSync(path.join(outDir, 'favicon.ico'), buf);

    fs.unlinkSync(path.join(outDir, 'favicon-16.png'));
    fs.unlinkSync(path.join(outDir, 'favicon-32.png'));

    console.log('All favicons generated successfully.');
  } catch (err) {
    console.error(err);
  }
})();
