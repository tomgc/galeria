# Registro de decisiones — galeria

Decisiones de diseño no obvias y excepciones declaradas a los Principios de
Desarrollo del usuario (`~/Desktop/principios_desarrollo_v3.md`).

## Decisiones técnicas

### 1. Pipeline de imágenes: master única + `astro:assets`

Cada foto se procesa una sola vez por el script de ingesta y se guarda como
**una JPEG master** en `src/assets/photos/[slug].jpg` (máx. 2400px, con
watermark y EXIF de autoría). En build, `astro:assets` genera las variantes
responsivas AVIF/WebP/JPEG en 400/800/1600/2400px.

Alternativa descartada: pre-generar las 12 variantes (3 formatos × 4 tamaños)
desde el script y excluir astro:assets. Más complejo, peor caché de build,
y la única ventaja —watermark solo en tamaños grandes— no compensa: tener
watermark en thumbnails también protege más, que es el objetivo.

### 2. TagFilter por ruta estática, no client-side

Cada tag tiene su propia URL (`/es/tags/[tag]/`) generada con
`getStaticPaths()`. Beneficios: funciona sin JS, mejor SEO (cada tag es
una página indexable), permite enlaces directos.

Alternativa descartada: filtrado client-side con JS sobre la grilla. Rompe
el criterio "navegable sin JS" y no aporta UX significativa para colecciones
de este tamaño.

### 3. Masonry con CSS columns (sin JS)

`column-count: 1/2/3/4` responsivo. Sin JS, sin layout shift, orden DOM
intacto para lectores de pantalla. El orden visual es por columnas, no
por filas — aceptable para una galería de fotos.

### 4. Obfuscación de correo: base64 + entidades HTML

El correo aparece visualmente como texto pero **nunca como cadena plana**
en el HTML renderizado. Verificación: `fetch /es/contacto/` no contiene
`tomas` ni `@gmail` ni el patrón regex `[a-z]+@[a-z]+`. JS reconstruye
`mailto:` al hacer click.

Limitación reconocida: un crawler que ejecute `atob()` sobre cadenas
base64-like vencería la obfuscación. Aceptado — el objetivo es detener
scrapers regex genéricos, no actores motivados.

### 5. Licencia dual con `LICENSE` MIT estándar + `LICENSE-PHOTOS.md`

Patrón estándar (Rust, muchos repos académicos): `LICENSE` es MIT puro
para que GitHub lo detecte y muestre el badge "MIT" automáticamente.
Las fotos llevan términos propios en `LICENSE-PHOTOS.md` con prohibición
explícita de entrenamiento de IA, reserva TDM (Directiva UE 2019/790)
y prohibición de NFTs.

### 6. GitHub Pages vía workflow, no Jekyll

`build_type=workflow` en la config de Pages. Astro genera el sitio; GitHub
solo recibe el artefacto y lo sirve. Sin esto, GitHub corre Jekyll por
defecto e intenta procesar `.md` como posts, lo que falla y genera ruido.

### 7. Watermark en pipeline de ingesta, no en `<img>` con CSS

El watermark va embebido en la imagen master. Razones:
- Sobrevive a copy-paste, screenshot, descarga.
- No depende de CSS que puede deshabilitarse.
- Coste: una vez por ingesta, no por request.

## Aplicación de los Principios

### Aplica plenamente
- B.1–B.4 (interacción), B aplicado a la conversación
- C.5 (modularidad): componentes `.astro`, helpers en `lib/photos.ts`
- C.6 (nomenclatura): slugs kebab-case, accents normalizados
- C.7 (portabilidad): `import.meta.url` + `path.resolve`, UTF-8 explícito
- C.9 (resiliencia): `try/catch` por archivo en el loop de ingesta
- C.10 (static-first / git-friendly): markdown + frontmatter, JSON-LD
- C.11 (transparencia): constantes nombradas al inicio de scripts
- C.12 (dependencias): `package.json` + `package-lock.json` commiteado
- C.13 (logging): progreso + resumen con dimensiones/tamaños
- D (naming sin tildes/ñ/espacios): aplicado en slugs y carpetas

### Aplica parcialmente, con adaptación
- **C.1 (Inmutabilidad de la fuente):** los RAW del autor viven fuera del
  repo (Google Drive). Dentro del repo, los originales en `_inbox/` se
  consideran inmutables — el script los mueve a `_inbox/_procesadas/`
  (gitignored) tras procesar, en lugar de borrarlos.
- **C.3 (Idempotencia):** re-ejecutar el script sobre una inbox vacía es
  no-op. Re-ejecutarlo sobre la misma foto (ya procesada) detecta colisión
  de slug y pide uno nuevo en TTY, o auto-numera en CI.
- **C.4 (Escritura atómica):** implementada como rollback explícito —
  si falla cualquier paso, se eliminan los outputs parciales (`.jpg`,
  `.md`). El rename del original es la última operación, así un fallo
  previo deja la foto disponible para reintentar. No es atomicidad
  estricta (no usa temp paths + rename), pero la garantía es equivalente
  para este caso: "o todo el set queda escrito y validado, o nada".
- **C.8 (Validación):** después de escribir la master, se verifica:
  dimensiones (lado mayor ≤ MAX_DIMENSION), tamaño mínimo (>1 KB),
  presencia de EXIF Artist/Copyright (warning si falta, sharp no siempre
  lo escribe correctamente en todos los formatos de entrada).

### No aplica
- **C.2 con seeds:** no hay aleatoriedad en el flujo. La reproducibilidad
  sí aplica y se cumple (build determinista desde clone fresco).
- **D.R (R / tidyverse / Quarto / `janitor::clean_names`):** proyecto
  TypeScript/Astro.
- **Estructura `data/raw`, `R/`, `qmd/`, `output/`, `tests/`, `cache/`:**
  proyecto web, no pipeline analítico. Estructura adoptada es Astro
  estándar: `src/`, `public/`, `scripts/`, `_inbox/`, `docs/`.

### Relajada con justificación
- **D.Web "Sin dependencias externas":** Astro tiene >250 dependencias
  transitivas. Justificación: Astro aporta valor concreto (image
  optimization, i18n, sitemap, content collections con validación Zod)
  que reescribir a mano duplicaría 1000+ líneas de código con peor
  resultado. Todas las deps directas están pinneadas con caret ranges
  y `package-lock.json` está versionado. `npm audit` sale 0 vulns.

---

*Última actualización: mayo 2026.*
