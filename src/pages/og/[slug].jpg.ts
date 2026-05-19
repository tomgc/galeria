import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllPhotos } from '../../lib/photos';

// Genera una imagen Open Graph optimizada (1200×630) para cada foto con
// el título y el nombre del autor sobre un gradiente legible.
// Las redes sociales (Twitter, Facebook, LinkedIn, etc.) muestran esta versión
// al compartir el link del detalle.
export const getStaticPaths: GetStaticPaths = async () => {
  const photos = await getAllPhotos();
  return photos.map((p) => ({
    params: { slug: p.id },
    props: { photoId: p.id, title: p.data.title_es },
  }));
};

interface Props {
  photoId: string;
  title: string;
}

const W = 1200;
const H = 630;
const AUTHOR = 'Tomás González Cifuentes';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Trunca el título a un largo razonable para que no se desborde del canvas.
// SVG <text> no hace word-wrap nativo, así que partimos en 2 líneas con un
// quiebre simple por palabras.
function wrap(s: string, maxChars: number): string[] {
  if (s.length <= maxChars) return [s];
  const words = s.split(/\s+/);
  let line1 = '';
  let i = 0;
  while (i < words.length && (line1 + ' ' + words[i]).length <= maxChars) {
    line1 = line1 ? `${line1} ${words[i]}` : words[i];
    i++;
  }
  const line2 = words.slice(i).join(' ');
  const trimmed = line2.length > maxChars ? line2.slice(0, maxChars - 1) + '…' : line2;
  return [line1, trimmed];
}

export const GET: APIRoute = async ({ props }) => {
  const { photoId, title } = props as unknown as Props;
  const photoPath = path.resolve(process.cwd(), 'src/assets/photos', `${photoId}.jpg`);
  const photoBuffer = await fs.readFile(photoPath);

  const lines = wrap(title, 42);
  const fontSize = 52;
  const lineGap = 14;
  const brandSize = 22;
  const padding = 56;

  // Posicionamos las líneas desde abajo hacia arriba
  const brandY = H - padding;
  const lastLineY = brandY - brandSize - 18;
  const lineYs = lines
    .slice()
    .reverse()
    .map((_, idx) => lastLineY - idx * (fontSize + lineGap))
    .reverse();

  const titleElements = lines
    .map(
      (line, i) =>
        `<text x="${padding}" y="${lineYs[i]}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" fill="#ffffff" font-weight="400">${escapeXml(line)}</text>`,
    )
    .join('\n');

  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="40%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${titleElements}
    <text x="${padding}" y="${brandY}" font-family="system-ui, -apple-system, sans-serif" font-size="${brandSize}"
          fill="rgba(255,255,255,0.78)" letter-spacing="1">${escapeXml(AUTHOR.toUpperCase())}</text>
  </svg>`);

  const output = await sharp(photoBuffer)
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();

  return new Response(output, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
