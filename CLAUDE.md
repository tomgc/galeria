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

## Criterios de calidad
- `npm run build` sin warnings (warning informativo de "no files found" en photos es OK mientras no haya fotos cargadas).
- Lighthouse >90 en Performance/SEO/Accessibility/Best Practices.
- Sitio navegable sin JavaScript (excepto: lightbox, toggle de tema, obfuscación de correo, anti-click-derecho).
- Correo NUNCA en texto plano en el HTML renderizado.
