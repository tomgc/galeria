#!/usr/bin/env node
/**
 * Ingesta de fotografías nuevas.
 *
 * Lee imágenes de _inbox/, las optimiza con sharp (máx. 2400px lado mayor),
 * les aplica watermark "© Tomás González Cifuentes" y EXIF Artist/Copyright,
 * y guarda una master en src/assets/photos/[slug].jpg. Después crea un
 * archivo .md prellenado en src/content/photos/[slug].md para que completes
 * a mano category, tags y descripciones. El original se mueve a
 * _inbox/_procesadas/ (gitignored).
 *
 * Uso:
 *   npm run ingest
 *   npm run ingest -- --no-watermark    # placeholders / pruebas
 *   npm run ingest -- --dry-run         # imprime acciones sin tocar archivos
 */

import { readdir, mkdir, rename, writeFile, rm, stat, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import sharp from 'sharp';
import exifr from 'exifr';

// --- Configuración ---
const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const INBOX = path.join(ROOT, '_inbox');
const PROCESSED = path.join(INBOX, '_procesadas');
const PHOTOS_DIR = path.join(ROOT, 'src', 'assets', 'photos');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'photos');
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 86;
const AUTHOR = 'Tomás González Cifuentes';
const COPYRIGHT = `© ${new Date().getFullYear()} ${AUTHOR}. Todos los derechos reservados.`;
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff']);

const args = new Set(process.argv.slice(2));
const NO_WATERMARK = args.has('--no-watermark');
const DRY_RUN = args.has('--dry-run');

// --- Utilidades ---
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base) {
  let slug = base;
  let n = 1;
  while (existsSync(path.join(PHOTOS_DIR, `${slug}.jpg`)) || existsSync(path.join(CONTENT_DIR, `${slug}.md`))) {
    if (stdin.isTTY) {
      const rl = readline.createInterface({ input: stdin, output: stdout });
      const input = (await rl.question(`Slug "${slug}" ya existe. Nuevo slug (enter = "${slug}-${n}"): `)).trim();
      rl.close();
      slug = input || `${base}-${n}`;
      n++;
    } else {
      n++;
      slug = `${base}-${n}`;
    }
  }
  return slug;
}

function formatShutter(s) {
  if (s == null) return undefined;
  if (s >= 1) return `${s}s`;
  const denom = Math.round(1 / s);
  return `1/${denom}s`;
}

function formatAperture(f) {
  if (f == null) return undefined;
  return `f/${Number(f).toFixed(1).replace(/\.0$/, '')}`;
}

function formatFocal(f) {
  if (f == null) return undefined;
  return `${Math.round(f)}mm`;
}

function watermarkSvg(width) {
  // Watermark sutil en la esquina inferior derecha. Tamaño proporcional al ancho.
  const fontSize = Math.max(14, Math.round(width * 0.018));
  const pad = Math.round(width * 0.015);
  const text = `© ${AUTHOR}`;
  // Doble capa: sombra oscura + texto claro, para legibilidad sobre cualquier fondo
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${fontSize * 2}">
      <style>
        .wm { font: ${fontSize}px system-ui, -apple-system, sans-serif; }
      </style>
      <text class="wm" x="${width - pad}" y="${fontSize + pad / 2}"
        text-anchor="end" fill="#000" fill-opacity="0.35">${text}</text>
      <text class="wm" x="${width - pad - 1}" y="${fontSize + pad / 2 - 1}"
        text-anchor="end" fill="#fff" fill-opacity="0.55">${text}</text>
    </svg>`,
  );
}

async function processOne(filename) {
  const srcPath = path.join(INBOX, filename);
  const base = slugify(path.basename(filename));
  if (!base) {
    console.warn(`  ⚠ Nombre vacío tras slugificar: ${filename} — saltado`);
    return null;
  }

  const slug = await uniqueSlug(base);
  const outImage = path.join(PHOTOS_DIR, `${slug}.jpg`);
  const outMd = path.join(CONTENT_DIR, `${slug}.md`);

  // EXIF
  let exif = {};
  try {
    exif = (await exifr.parse(srcPath, { tiff: true, ifd0: true, exif: true, gps: true })) || {};
  } catch (err) {
    console.warn(`  ⚠ No se pudo leer EXIF de ${filename}: ${err.message}`);
  }

  const image = sharp(srcPath, { failOn: 'none' });
  const meta = await image.metadata();
  const isLandscape = (meta.width ?? 0) >= (meta.height ?? 0);
  const resizeOpts = isLandscape
    ? { width: Math.min(meta.width ?? MAX_DIMENSION, MAX_DIMENSION) }
    : { height: Math.min(meta.height ?? MAX_DIMENSION, MAX_DIMENSION) };

  let pipeline = image.rotate().resize({ ...resizeOpts, withoutEnlargement: true });

  // Aplicar watermark sobre el output resized
  if (!NO_WATERMARK) {
    const resized = await pipeline.clone().toBuffer({ resolveWithObject: true });
    pipeline = sharp(resized.data).composite([
      { input: watermarkSvg(resized.info.width), gravity: 'southeast' },
    ]);
  }

  // EXIF de salida: preservar campos y forzar Artist/Copyright
  const outputExif = {
    IFD0: {
      Artist: AUTHOR,
      Copyright: COPYRIGHT,
      Software: 'galeria-ingest',
    },
  };

  if (DRY_RUN) {
    console.log(`  ➜ [dry] ${filename} → ${slug}.jpg + ${slug}.md`);
    return { slug, exif };
  }

  // Escritura semi-atómica: si falla cualquiera de los pasos, hacemos rollback
  // de lo que se haya escrito. El rename del original va al final, así un
  // fallo previo deja la foto en _inbox/ disponible para reintentar.
  let imageWritten = false;
  let mdWritten = false;
  try {
    await pipeline
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .withMetadata({ exif: outputExif })
      .toFile(outImage);
    imageWritten = true;

    // Validación post-escritura (C.8)
    const stats = await validateOutput(outImage, slug);

    const frontmatter = buildFrontmatter(slug, exif);
    await writeFile(outMd, frontmatter, 'utf8');
    mdWritten = true;

    // Mover original a _procesadas — última operación, después de validar
    await mkdir(PROCESSED, { recursive: true });
    await rename(srcPath, path.join(PROCESSED, filename));

    return { slug, exif, stats };
  } catch (err) {
    if (imageWritten) await rm(outImage, { force: true }).catch(() => {});
    if (mdWritten) await rm(outMd, { force: true }).catch(() => {});
    throw err;
  }
}

/** Verifica que la imagen de salida es legible, tiene dimensiones razonables
 *  y conserva los campos EXIF Artist/Copyright. Devuelve metadata útil para
 *  el resumen final. Si algo está mal, lanza error y se hace rollback. */
async function validateOutput(imagePath, slug) {
  const meta = await sharp(imagePath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Imagen de salida corrupta o no legible: ${slug}.jpg`);
  }
  const longSide = Math.max(meta.width, meta.height);
  if (longSide > MAX_DIMENSION + 4) {
    throw new Error(
      `Imagen excede el límite de ${MAX_DIMENSION}px (lado mayor: ${longSide})`,
    );
  }
  const fileStat = await stat(imagePath);
  if (fileStat.size < 1024) {
    throw new Error(`Imagen de salida sospechosamente pequeña: ${fileStat.size} bytes`);
  }

  const outExif = (await exifr.parse(imagePath, { ifd0: true }).catch(() => null)) || {};
  if (!outExif.Artist || !outExif.Copyright) {
    console.warn(
      `  ⚠ EXIF Artist/Copyright no se grabó en ${slug}.jpg (sharp/libtiff puede saltarlo en algunos formatos)`,
    );
  }

  return { width: meta.width, height: meta.height, sizeKB: Math.round(fileStat.size / 1024) };
}

function buildFrontmatter(slug, exif) {
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const date = exif?.DateTimeOriginal || exif?.CreateDate || new Date();
  const dateIso = new Date(date).toISOString().slice(0, 10);

  const cameraModel = exif?.Model || '';
  const cameraLens = exif?.LensModel || exif?.Lens || '';
  const aperture = formatAperture(exif?.FNumber ?? exif?.ApertureValue) ?? '';
  const shutter = formatShutter(exif?.ExposureTime) ?? '';
  const iso = exif?.ISO ?? '';
  const focal = formatFocal(exif?.FocalLength) ?? '';

  // GPS de EXIF — exifr lo entrega como latitude/longitude decimales
  const coordsBlock =
    typeof exif?.latitude === 'number' && typeof exif?.longitude === 'number'
      ? `\ncoords:\n  lat: ${exif.latitude.toFixed(6)}\n  lng: ${exif.longitude.toFixed(6)}\n`
      : '';

  return `---
# COMPLETAR: title_es (placeholder generado del slug), category, tags, location, description_es
title_es: "${title}"
title_en: ""

category: aves          # aves | paisajes
tags: []                # ej: [chucao, bosque-valdiviano, puerto-williams]

# Solo aves — borra estas 3 líneas si es paisaje
species_common_es: ""
species_common_en: ""
species_scientific: ""

location:
  city: ""
  region: ""
  country: "Chile"
${coordsBlock}
date_taken: ${dateIso}

camera:
  model: "${cameraModel}"
  lens: "${cameraLens}"

exif:
  aperture: "${aperture}"
  shutter_speed: "${shutter}"
  iso: ${iso || '""'}
  focal_length: "${focal}"

description_es: ""
description_en: ""

featured: false
for_sale: false

image: "../../assets/photos/${slug}.jpg"
---
`;
}

// --- Main ---
(async function main() {
  if (!existsSync(INBOX)) {
    console.error(`No existe ${INBOX}`);
    process.exit(1);
  }
  await mkdir(PHOTOS_DIR, { recursive: true });
  await mkdir(CONTENT_DIR, { recursive: true });

  const entries = (await readdir(INBOX, { withFileTypes: true }))
    .filter((d) => d.isFile() && EXTS.has(path.extname(d.name).toLowerCase()))
    .map((d) => d.name);

  if (entries.length === 0) {
    console.log(`📭 _inbox/ vacía. Copia fotos ahí y vuelve a correr "npm run ingest".`);
    return;
  }

  console.log(`📦 Procesando ${entries.length} foto(s)${NO_WATERMARK ? ' [sin watermark]' : ''}${DRY_RUN ? ' [dry-run]' : ''}\n`);

  const results = [];
  for (const file of entries) {
    console.log(`• ${file}`);
    try {
      const result = await processOne(file);
      if (result) results.push(result);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  console.log(`\n✓ Ingesta completada. ${results.length}/${entries.length} foto(s) procesadas.`);
  if (results.length > 0) {
    console.log(`\nResumen:`);
    for (const r of results) {
      const dims = r.stats ? ` (${r.stats.width}×${r.stats.height}, ${r.stats.sizeKB} KB)` : '';
      console.log(`  ✓ ${r.slug}${dims}`);
    }
    console.log(`\nFaltan metadatos manuales en:`);
    for (const r of results) {
      console.log(`  - src/content/photos/${r.slug}.md  (category, tags, descripción, ubicación)`);
    }
  }
})().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
