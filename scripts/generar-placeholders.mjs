#!/usr/bin/env node
/**
 * Genera imágenes placeholder en _inbox/ para previsualizar el sitio sin
 * fotos reales. Cada placeholder es un gradiente con texto "PLACEHOLDER".
 *
 * Después de correr este script:
 *   npm run ingest -- --no-watermark
 *
 * El --no-watermark evita estampar "© Tomás González Cifuentes" sobre
 * imágenes que no son fotos reales.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const INBOX = path.join(ROOT, '_inbox');

const placeholders = [
  // Aves: tonos verdes/marrones, ratios variados
  { slug: 'chucao-bosque-valdiviano', w: 2400, h: 1600, c1: '#2d3e1f', c2: '#5a7c47', label: 'Aves · 3:2' },
  { slug: 'huet-huet-cordillera',     w: 1600, h: 2400, c1: '#3a2818', c2: '#6b4a2a', label: 'Aves · 2:3 vertical' },
  { slug: 'carpintero-negro',          w: 2400, h: 1800, c1: '#1a1a1a', c2: '#5a3a2a', label: 'Aves · 4:3' },
  { slug: 'martin-pescador-rio',       w: 1500, h: 2700, c1: '#1a3a4a', c2: '#3a5a6a', label: 'Aves · 5:9 muy vertical' },
  // Paisajes: tonos azules/cálidos, ratios variados
  { slug: 'torres-del-paine-amanecer', w: 3200, h: 1600, c1: '#5b3a4a', c2: '#c9956c', label: 'Paisajes · 2:1 cinemática' },
  { slug: 'volcan-villarrica',         w: 2400, h: 1800, c1: '#1a2e44', c2: '#4a7090', label: 'Paisajes · 4:3' },
  { slug: 'glaciar-grey',              w: 2400, h: 2000, c1: '#3a5269', c2: '#a8c4d8', label: 'Paisajes · 6:5' },
  { slug: 'campo-de-hielo-sur',        w: 3500, h: 1000, c1: '#2a4a5a', c2: '#8aaac4', label: 'Paisajes · 3.5:1 panorámica' },
];

await mkdir(INBOX, { recursive: true });

for (const p of placeholders) {
  const fontSize = Math.round(p.w * 0.045);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p.c1}" />
        <stop offset="100%" stop-color="${p.c2}" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="${fontSize}"
          fill="#ffffff" fill-opacity="0.35" text-anchor="middle" dominant-baseline="middle">
      PLACEHOLDER
    </text>
    <text x="50%" y="${Math.round(p.h * 0.5 + fontSize * 0.8)}" font-family="system-ui, sans-serif"
          font-size="${Math.round(fontSize * 0.5)}" fill="#ffffff" fill-opacity="0.5"
          text-anchor="middle" dominant-baseline="middle">
      ${p.label}
    </text>
  </svg>`;

  const outPath = path.join(INBOX, `${p.slug}.jpg`);
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile(outPath);
  console.log(`✓ ${p.slug}.jpg (${p.w}×${p.h})`);
}

console.log(`\n→ Ahora corre: npm run ingest -- --no-watermark`);
