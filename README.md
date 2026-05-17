# galeria

> **⚠ Aviso de derechos de autor.** Las fotografías de este repositorio son
> obra original de Tomás González Cifuentes y están protegidas. **No pueden
> reproducirse, distribuirse ni utilizarse para entrenar modelos de
> inteligencia artificial** sin autorización escrita. Ver
> [`LICENSE-PHOTOS.md`](LICENSE-PHOTOS.md) para los términos completos
> aplicables a las fotos. El código fuente está bajo licencia [MIT](LICENSE).

Sitio web estático para mostrar mi archivo de fotografía de naturaleza
(aves y paisajes de Chile y la Patagonia), desplegado en GitHub Pages en
[tomgc.github.io/galeria](https://tomgc.github.io/galeria/).

## Stack

- [Astro 6](https://astro.build/) + TypeScript estricto
- CSS vanilla con custom properties (sin Tailwind/Bootstrap)
- [`astro:assets`](https://docs.astro.build/en/guides/images/) para AVIF/WebP/JPEG responsivos
- [PhotoSwipe v5](https://photoswipe.com/) para lightbox
- [@fontsource/playfair-display](https://fontsource.org/) (self-hosted)
- [Sharp](https://sharp.pixelplumbing.com/) + [exifr](https://github.com/MikeKovarik/exifr) para ingesta
- [GoatCounter](https://www.goatcounter.com/) para analytics (privacy-friendly)
- GitHub Actions → GitHub Pages

## Desarrollo local

Requiere Node 20+.

```sh
git clone https://github.com/tomgc/galeria.git
cd galeria
npm install
cp .env.example .env       # rellena PUBLIC_CONTACT_EMAIL
npm run dev                # http://localhost:4321/galeria/
```

## Cómo agregar fotos nuevas

1. Copia los archivos originales (`.jpg`, `.jpeg`, `.png`, `.tif`) en `_inbox/`.
2. Corre `npm run ingest`. El script:
   - Optimiza la imagen a máx. **2400px** lado mayor (JPEG mozjpeg q86).
   - Aplica watermark `© Tomás González Cifuentes` en la esquina inferior derecha.
   - Reescribe los campos EXIF `Artist` y `Copyright`.
   - Guarda la master en `src/assets/photos/[slug].jpg`.
   - Crea `src/content/photos/[slug].md` con frontmatter prellenado.
   - Mueve el original a `_inbox/_procesadas/` (no versionado).
3. Edita el `.md` recién creado para completar `category`, `tags`, descripción,
   ubicación y demás campos opcionales.
4. `git commit && git push` → GitHub Actions despliega automáticamente.

Detalles en [`scripts/README.md`](scripts/README.md).

## Variables de entorno

| Variable | Uso |
|---|---|
| `PUBLIC_CONTACT_EMAIL` | Correo que aparece (obfuscado) en la página de contacto. |
| `PUBLIC_GOATCOUNTER_CODE` | Subdominio de GoatCounter para analytics. Dejar vacío para deshabilitar. |

En producción, configurar como secrets en el repo de GitHub. El workflow
`deploy.yml` los inyecta en build.

## Despliegue

Push a `main` dispara el workflow [`deploy.yml`](.github/workflows/deploy.yml)
que construye el sitio y lo publica en Pages.

Prerrequisito una vez: en `Settings → Pages` del repo, elegir
"GitHub Actions" como **Build and deployment source**.

## Protección anti-scraping / anti-IA

Medidas implementadas (todas son disuasivas, no infalibles):

- Watermark visible en todas las imágenes servidas.
- Resolución máxima pública: 2400px lado mayor.
- `robots.txt` bloquea GPTBot, Google-Extended, CCBot, anthropic-ai, ClaudeBot,
  PerplexityBot, Bytespider, Amazonbot, ImagesiftBot, img2dataset, etc.
- JSON-LD `ImageObject` con `license` CC BY-NC-ND apuntando a este sitio.
- Click derecho y arrastrar sobre `<img>` bloqueados con JS.
- Correo de contacto nunca aparece como texto plano en el HTML.

**Limitación**: GitHub Pages no permite custom HTTP headers, así que la
protección de hotlinking completa requeriría poner Cloudflare delante.
Pendiente para una fase futura si hace falta.

## Estructura

```
galeria/
├── .github/workflows/deploy.yml    # CI/CD a GitHub Pages
├── astro.config.mjs                # config Astro: i18n, sitemap, base
├── scripts/ingest.mjs              # ingesta de fotos
├── _inbox/                         # fotos sin procesar (gitignored)
├── public/                         # favicon, robots.txt
└── src/
    ├── assets/photos/              # masters watermarked (2400px max)
    ├── components/                 # Gallery, PhotoCard, Lightbox, TagFilter, ObfuscatedEmail, Header, Footer
    ├── content/photos/             # un .md por foto (frontmatter Zod-validado)
    ├── content.config.ts           # schema de la colección
    ├── i18n/                       # diccionarios es/en + helper useTranslations
    ├── layouts/BaseLayout.astro
    ├── lib/photos.ts               # helpers (getAllPhotos, getTagsWithCounts, siblings)
    ├── pages/
    │   ├── index.astro             # redirige a /es/
    │   ├── 404.astro
    │   ├── es/                     # portada, aves, paisajes, tags/[tag], foto/[slug], sobre-mi, contacto
    │   └── en/                     # esqueleto en inglés (traducción pendiente)
    └── styles/global.css
```

## Licencia

Este repositorio tiene **doble licencia**:

- **Código fuente** (Astro, componentes, scripts) → [MIT](LICENSE). Libre
  de usar, modificar y redistribuir.
- **Fotografías y contenido visual** → © Tomás González Cifuentes, todos
  los derechos reservados, con prohibición explícita de uso para
  entrenamiento de IA y obras derivadas. Términos completos en
  [`LICENSE-PHOTOS.md`](LICENSE-PHOTOS.md).

Además, el sitio publica `robots.txt` y `ai.txt` que indican a crawlers
y agentes automatizados los usos no autorizados.
