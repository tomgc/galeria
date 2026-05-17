# scripts

## `ingest.mjs` — ingesta de fotos nuevas

Toma las imágenes que copies en `_inbox/`, las optimiza, les aplica watermark
y EXIF de autoría, y genera la entrada `.md` correspondiente.

### Flujo

1. Copia tus archivos originales (`.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`)
   a `_inbox/` en la raíz del repo.
2. Corre:

   ```sh
   npm run ingest
   ```

3. Para cada foto, el script:
   - Genera un slug a partir del nombre del archivo (te pregunta si hay colisión).
   - Lee el EXIF original con `exifr`.
   - Redimensiona con `sharp` a máximo **2400px** en el lado mayor (sin
     re-escalar hacia arriba).
   - Aplica watermark `© Tomás González Cifuentes` en la esquina inferior
     derecha (a no ser que pases `--no-watermark`).
   - Reescribe los campos EXIF `Artist`, `Copyright` y `Software` para
     dejar atribución legible en el archivo final.
   - Guarda la master JPEG (calidad 86, mozjpeg) en
     `src/assets/photos/[slug].jpg`. **`astro:assets` genera las variantes
     responsivas (AVIF/WebP/JPEG) en build.**
   - Crea `src/content/photos/[slug].md` con el frontmatter prellenado.
   - Mueve el original a `_inbox/_procesadas/` (no se versiona).

4. Edita el `.md` recién creado para completar:
   - `title_es` (el placeholder viene del slug; mejóralo).
   - `category`: `aves` o `paisajes`.
   - `tags`: array libre.
   - `species_common_es/en` y `species_scientific` si es ave (borra estos
     campos si es paisaje).
   - `location` (ciudad, región, país).
   - `description_es`/`description_en` si quieres.
   - `featured: true` para que aparezca en portada.

### Flags

| Flag | Efecto |
|---|---|
| `--no-watermark` | No aplica watermark. Útil para placeholders o pruebas. |
| `--dry-run` | Imprime las acciones sin escribir nada. |

### Notas

- Los archivos en `_inbox/_procesadas/` están ignorados por Git, son tu
  respaldo local del original.
- Si necesitas reprocesar una foto, borra `src/assets/photos/[slug].jpg`
  y `src/content/photos/[slug].md`, copia el original de vuelta a `_inbox/`
  y vuelve a correr el script.
- El script preserva el aspect ratio. No recorta.
