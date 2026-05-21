#!/usr/bin/env node
// Gestor local de fotos para la galería.
//   $ npm run manage
// Levanta una UI web en http://localhost:4322 que permite editar metadatos,
// borrar fotos, reordenarlas y publicar al sitio (commit + push).
//
// El gestor NO sube fotos nuevas: para eso sigue siendo `npm run ingest`.

import express from 'express';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import matter from 'gray-matter';
import sharp from 'sharp';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PHOTOS_MD = path.join(ROOT, 'src/content/photos');
const PHOTOS_IMG = path.join(ROOT, 'src/assets/photos');
// Papelera local (gitignored). El gestor mueve archivos aquí en vez de borrar
// directo: si algo se elimina por error, se recupera desde acá.
const TRASH = path.join(ROOT, '_trash');
// Cache en /tmp para evitar ensuciar node_modules y para que sendFile no choque
// con la regla anti-dotfiles del módulo `send` (Express 5).
const THUMBS = path.join(os.tmpdir(), 'galeria-manage-thumbs');
const UI_DIR = path.join(__dirname, 'manage-ui');
const SORTABLE_JS = path.join(ROOT, 'node_modules/sortablejs/Sortable.min.js');
const PORT = 4322;

// ── Helpers de archivo ──────────────────────────────────────────────────────

function formatDate(d) {
  if (typeof d === 'string') return d;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d);
}

function quote(s) {
  return `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Serializa el frontmatter al formato canónico del proyecto. Mantiene el
// orden de campos y el estilo (comillas dobles, tags en flow) que usan los
// .md actuales para minimizar diffs al guardar.
function formatFrontmatter(data) {
  const lines = [];
  lines.push('---');
  lines.push(`title_es: ${quote(data.title_es)}`);
  lines.push(`title_en: ${quote(data.title_en ?? '')}`);
  lines.push('');
  lines.push(`category: ${data.category}`);
  const tags = (data.tags ?? []).join(', ');
  lines.push(`tags: [${tags}]`);
  lines.push('');

  if (data.category === 'aves') {
    lines.push(`species_common_es: ${quote(data.species_common_es ?? '')}`);
    lines.push(`species_common_en: ${quote(data.species_common_en ?? '')}`);
    lines.push(`species_scientific: ${quote(data.species_scientific ?? '')}`);
    lines.push('');
  }

  const loc = data.location ?? {};
  lines.push('location:');
  lines.push(`  city: ${quote(loc.city ?? '')}`);
  lines.push(`  region: ${quote(loc.region ?? '')}`);
  lines.push(`  country: ${quote(loc.country ?? 'Chile')}`);
  lines.push('');

  if (data.coords && data.coords.lat != null && data.coords.lng != null) {
    lines.push('coords:');
    lines.push(`  lat: ${data.coords.lat}`);
    lines.push(`  lng: ${data.coords.lng}`);
    lines.push('');
  }

  lines.push(`date_taken: ${formatDate(data.date_taken)}`);
  lines.push('');

  const cam = data.camera ?? {};
  lines.push('camera:');
  lines.push(`  model: ${quote(cam.model ?? '')}`);
  lines.push(`  lens: ${quote(cam.lens ?? '')}`);
  lines.push('');

  const ex = data.exif ?? {};
  lines.push('exif:');
  lines.push(`  aperture: ${quote(ex.aperture ?? '')}`);
  lines.push(`  shutter_speed: ${quote(ex.shutter_speed ?? '')}`);
  if (ex.iso != null && ex.iso !== '') {
    lines.push(typeof ex.iso === 'number' ? `  iso: ${ex.iso}` : `  iso: ${quote(ex.iso)}`);
  } else {
    lines.push(`  iso: ""`);
  }
  lines.push(`  focal_length: ${quote(ex.focal_length ?? '')}`);
  lines.push('');

  lines.push(`description_es: ${quote(data.description_es ?? '')}`);
  lines.push(`description_en: ${quote(data.description_en ?? '')}`);
  lines.push('');

  lines.push(`featured: ${data.featured ? 'true' : 'false'}`);
  lines.push(`for_sale: ${data.for_sale ? 'true' : 'false'}`);
  if (data.price_usd != null) lines.push(`price_usd: ${data.price_usd}`);
  if (data.order != null) lines.push(`order: ${data.order}`);
  lines.push('');

  lines.push(`image: ${quote(data.image)}`);
  lines.push('---');
  return lines.join('\n') + '\n';
}

async function readAllPhotos() {
  const files = (await fs.readdir(PHOTOS_MD)).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md',
  );
  const out = [];
  for (const f of files) {
    const full = path.join(PHOTOS_MD, f);
    const raw = await fs.readFile(full, 'utf-8');
    const parsed = matter(raw);
    out.push({
      slug: path.basename(f, '.md'),
      data: {
        ...parsed.data,
        date_taken: formatDate(parsed.data.date_taken),
      },
    });
  }
  // Mismo orden que el sitio: order asc primero, luego date_taken desc.
  out.sort((a, b) => {
    const ao = a.data.order;
    const bo = b.data.order;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    return new Date(b.data.date_taken).getTime() - new Date(a.data.date_taken).getTime();
  });
  return out;
}

async function readPhoto(slug) {
  const fp = path.join(PHOTOS_MD, `${slug}.md`);
  const raw = await fs.readFile(fp, 'utf-8');
  const parsed = matter(raw);
  return {
    data: { ...parsed.data, date_taken: formatDate(parsed.data.date_taken) },
    content: parsed.content,
  };
}

async function writePhoto(slug, updates) {
  const current = await readPhoto(slug);
  // merge superficial; location y demás objetos se reemplazan completos si vienen.
  const merged = { ...current.data, ...updates };
  if (updates.location) merged.location = { ...current.data.location, ...updates.location };
  if (updates.camera) merged.camera = { ...current.data.camera, ...updates.camera };
  if (updates.exif) merged.exif = { ...current.data.exif, ...updates.exif };
  if (updates.order === null) delete merged.order;

  // Escritura atómica (C.4): si el proceso muere mid-write, el .md original
  // queda intacto. POSIX rename es atómico dentro del mismo filesystem.
  const out = formatFrontmatter(merged) + (current.content || '');
  const finalPath = path.join(PHOTOS_MD, `${slug}.md`);
  const tmpPath = `${finalPath}.tmp`;
  await fs.writeFile(tmpPath, out, 'utf-8');
  await fs.rename(tmpPath, finalPath);
}

async function deletePhoto(slug) {
  // En vez de unlink, mueve a la papelera con un timestamp. Recuperable.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(TRASH, ts);
  await fs.mkdir(dest, { recursive: true });
  for (const ext of ['md', 'jpg']) {
    const src = ext === 'md'
      ? path.join(PHOTOS_MD, `${slug}.${ext}`)
      : path.join(PHOTOS_IMG, `${slug}.${ext}`);
    try {
      await fs.rename(src, path.join(dest, `${slug}.${ext}`));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  await fs.unlink(path.join(THUMBS, `${slug}.jpg`)).catch(() => {});
  console.log(`[manage] borrado → _trash/${ts}/${slug}.{md,jpg}`);
}

async function getThumb(slug) {
  const cache = path.join(THUMBS, `${slug}.jpg`);
  try {
    await fs.access(cache);
    return cache;
  } catch {}
  await fs.mkdir(THUMBS, { recursive: true });
  const src = path.join(PHOTOS_IMG, `${slug}.jpg`);
  await sharp(src)
    .rotate()
    .resize({ width: 480, height: 480, fit: 'inside' })
    .jpeg({ quality: 80 })
    .toFile(cache);
  return cache;
}

// Valida la forma de un body de PUT antes de tocar disco (C.8). Devuelve null
// si OK o un string con el primer error encontrado. No exige todos los campos
// porque el PUT es parcial (merge), pero los que vengan deben tener tipos
// válidos para que el schema de Astro acepte el resultado al build.
const VALID_CATEGORIES = new Set(['aves', 'paisajes']);

function validatePhotoUpdate(body) {
  if (!body || typeof body !== 'object') return 'body debe ser un objeto JSON';
  if ('title_es' in body) {
    if (typeof body.title_es !== 'string' || body.title_es.trim() === '') {
      return 'title_es no puede estar vacío';
    }
  }
  if ('category' in body && !VALID_CATEGORIES.has(body.category)) {
    return `category inválida (esperado: ${[...VALID_CATEGORIES].join(' | ')})`;
  }
  if ('tags' in body) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string')) {
      return 'tags debe ser array de strings';
    }
  }
  if ('featured' in body && typeof body.featured !== 'boolean') {
    return 'featured debe ser boolean';
  }
  if ('order' in body && body.order !== null && typeof body.order !== 'number') {
    return 'order debe ser number o null';
  }
  if ('location' in body && (typeof body.location !== 'object' || Array.isArray(body.location))) {
    return 'location debe ser objeto';
  }
  return null;
}

function git(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('git', args, { cwd: ROOT });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('exit', (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error((err || `exit ${code}`).trim())),
    );
  });
}

// ── Auto-publish: batch tras 30s sin cambios ───────────────────────────────

const AUTO_PUBLISH_DELAY_MS = 30_000;

// Estado in-memory del auto-publish. Sólo persiste mientras el server vive.
const auto = {
  lastChangeAt: 0,   // ms epoch del último PUT/DELETE/reorder
  publishing: false, // hay un push en curso
  lastPublishedAt: 0,
  lastError: null,   // string con el último error o null
};
let autoTimer = null;

/** Marca que hubo un cambio en disco. Reinicia el countdown del auto-publish. */
function markChange() {
  auto.lastChangeAt = Date.now();
  auto.lastError = null;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(() => doAutoPublish(), AUTO_PUBLISH_DELAY_MS);
}

/** Hace commit + push si hay algo que publicar. Reentrante-seguro. */
async function doPublish(message) {
  if (auto.publishing) return { skipped: 'ya hay un push en curso' };
  const dirty = await git(['status', '--porcelain']);
  if (!dirty) return { skipped: 'no hay cambios' };
  auto.publishing = true;
  try {
    await git(['add', 'src/content/photos', 'src/assets/photos']);
    await git(['commit', '-m', message]);
    await git(['push']);
    auto.lastPublishedAt = Date.now();
    auto.lastError = null;
    console.log(`[manage] ✓ publicado: "${message}"`);
    return { ok: true };
  } finally {
    auto.publishing = false;
  }
}

async function doAutoPublish() {
  try {
    const r = await doPublish('manage: cambios desde el gestor (auto)');
    if (r.skipped) console.log(`[manage] auto-publish saltado: ${r.skipped}`);
  } catch (e) {
    auto.lastError = e.message;
    console.error(`[manage] ✗ auto-publish falló: ${e.message}`);
  }
}

// ── App ─────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/photos', async (req, res) => {
  try {
    res.json({ photos: await readAllPhotos() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/photos/:slug', async (req, res) => {
  const err = validatePhotoUpdate(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    await writePhoto(req.params.slug, req.body || {});
    markChange();
    console.log(`[manage] PUT ${req.params.slug}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/photos/:slug', async (req, res) => {
  try {
    await deletePhoto(req.params.slug);
    markChange();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reorder', async (req, res) => {
  try {
    const { slugs } = req.body || {};
    if (!Array.isArray(slugs) || slugs.length === 0) {
      return res.status(400).json({ error: 'slugs[] requerido y no vacío' });
    }
    // Validar antes de tocar nada: todos los slugs deben existir y ser strings.
    for (const s of slugs) {
      if (typeof s !== 'string' || !/^[a-z0-9-]+$/i.test(s)) {
        return res.status(400).json({ error: `slug inválido: ${s}` });
      }
      try {
        await fs.access(path.join(PHOTOS_MD, `${s}.md`));
      } catch {
        return res.status(400).json({ error: `slug no existe: ${s}` });
      }
    }
    for (let i = 0; i < slugs.length; i++) {
      await writePhoto(slugs[i], { order: i });
    }
    markChange();
    console.log(`[manage] reorder de ${slugs.length} fotos`);
    res.json({ ok: true, n: slugs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const out = await git(['status', '--porcelain']);
    const lines = out ? out.split('\n').filter(Boolean) : [];
    // Cuánto falta para el próximo auto-publish, en ms (negativo si ya pasó / null si no hay cambios)
    const nextAutoIn =
      lines.length === 0
        ? null
        : Math.max(0, auto.lastChangeAt + AUTO_PUBLISH_DELAY_MS - Date.now());
    res.json({
      pendientes: lines.length,
      lineas: lines,
      auto: {
        publishing: auto.publishing,
        nextAutoIn,
        lastPublishedAt: auto.lastPublishedAt || null,
        lastError: auto.lastError,
        delayMs: AUTO_PUBLISH_DELAY_MS,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/publish', async (req, res) => {
  const message = String(
    req.body?.message || 'manage: cambios desde el gestor de fotos',
  ).slice(0, 500);
  try {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    const r = await doPublish(message);
    if (r.skipped) {
      return res.json({ ok: true, message: `Nada que publicar (${r.skipped}).`, publicado: false });
    }
    res.json({ ok: true, message: 'Publicado al sitio.', publicado: true });
  } catch (e) {
    auto.lastError = e.message;
    res.status(500).json({ error: e.message });
  }
});

app.get('/thumb/:slug', async (req, res) => {
  try {
    res.sendFile(await getThumb(req.params.slug));
  } catch {
    res.status(404).end();
  }
});

app.get('/img/:slug', (req, res) => {
  res.sendFile(path.join(PHOTOS_IMG, `${req.params.slug}.jpg`), (err) => {
    if (err) res.status(404).end();
  });
});

app.get('/vendor/sortable.js', (req, res) => res.sendFile(SORTABLE_JS));

app.use(express.static(UI_DIR));

const server = app.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  🌿  Gestor de fotos');
  console.log(`      ${url}`);
  console.log('      (Ctrl+C para detener)');
  console.log('');
  try {
    await open(url);
  } catch {}
});

process.on('SIGINT', () => {
  console.log('\n  ✓ Gestor detenido.');
  server.close(() => process.exit(0));
});
