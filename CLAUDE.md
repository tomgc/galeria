# CLAUDE.md — instrucciones del proyecto

## Operación
- Commit y push después de cada cambio significativo. **Sin pedir confirmación.**
- Mensajes de commit en español, formato conventional (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- No fragmentes commits artificialmente: cambios relacionados van juntos.
- No preguntes "¿avanzo a la siguiente fase?". Si el plan está acordado, avanza.

## Cuándo SÍ confirmar
- Borrar fotos del repo o de `src/content/photos/`.
- Force-push, reset --hard, rewriting history.
- Cambios al `astro.config.mjs` que afecten el deploy (site/base/output).
- Decisiones de diseño con trade-offs reales (qué librería nueva, qué arquitectura).

## Convenciones de este proyecto
- Atribuciones (footer, EXIF, watermark, JSON-LD, meta): **"Tomás González Cifuentes"**, sin abreviar.
- Idioma del contenido: español (`/es/` por defecto, `/en/` como esqueleto vacío).
- Imágenes públicas: master única watermarked a máx. 2400px en `src/assets/photos/`.
  `astro:assets` genera variantes AVIF/WebP/JPEG en build. No subas archivos `>4 MB`.
- Fotos sin procesar van en `_inbox/` (gitignored) y se ingieren con `npm run ingest`.
- Originales/RAW se guardan fuera del repo (Google Drive del usuario).

## Stack
- Astro 6 + TypeScript estricto
- CSS vanilla con custom properties (sin Tailwind/Bootstrap)
- PhotoSwipe v5 para lightbox
- `@fontsource/playfair-display` (self-hosted)
- Sharp + exifr para ingesta
- Deploy: GitHub Actions → GitHub Pages en `https://tomgc.github.io/galeria/`
- Gestor local de fotos: `npm run manage` (Express + UI vanilla + SortableJS).
  Abre `http://localhost:4322` para editar metadatos, borrar, reordenar y
  publicar al sitio. Sólo gestiona; para subir fotos nuevas seguir usando
  `npm run ingest`.

## Criterios de calidad
- `npm run build` sin warnings (warning informativo de "no files found" en photos es OK mientras no haya fotos cargadas).
- Lighthouse >90 en Performance/SEO/Accessibility/Best Practices.
- Sitio navegable sin JavaScript (excepto: lightbox, toggle de tema, obfuscación de correo, anti-click-derecho).
- Correo NUNCA en texto plano en el HTML renderizado.

## Últimos cambios
- 2026-05-20 — Gestor local de fotos (`npm run manage`): UI web en `localhost:4322` para editar título/categoría/tags/especie/ubicación/descripción, borrar (mueve a `_trash/`, recuperable), reordenar por arrastre y publicar al sitio (commit+push). Schema extendido con campo `order` opcional; el sort respeta `order` ascendente y cae a `date_taken` desc cuando no hay.
- 2026-05-20 — Completados los metadatos de las 27 fotos restantes (46/46). Viaje a Costa Rica incorporado (quetzal, búho de anteojos, perezoso, dos colibríes), Patagonia austral (camino a cordillera, loica, aguiluchos sobre bosque de lenga), aves costeras chilenas (rayador, perritos), y nuevos identificados (martín pescador grande macho/hembra, pitío, golondrina chilena).
- 2026-05-20 — `scripts/update-photo-metadata.py` extendido a 46 detecciones; ejecutarlo regenera todos los `.md` preservando EXIF.
- e262454 — chore: persistir script de update de metadatos para uso posterior.
- a9c3efc — feat: primeras fotos reales — 46 ingeridas, 19 con metadatos completos.
