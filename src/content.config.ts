import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Schema de cada fotografía. Una entrada por archivo en src/content/photos/[slug].md
// El campo `image` apunta a la master (única) optimizada por scripts/ingest.mjs y
// guardada en src/assets/photos/. Las variantes responsivas (AVIF/WebP/JPEG en
// 400/800/1600/2400) las genera astro:assets en build.
const photos = defineCollection({
  loader: glob({
    pattern: ['**/*.{md,yaml,yml}', '!**/README.*', '!**/_*'],
    base: './src/content/photos',
  }),
  schema: ({ image }) =>
    z.object({
      title_es: z.string().min(1),
      title_en: z.string().default(''),

      category: z.enum(['aves', 'paisajes']),
      tags: z.array(z.string()).default([]),

      // Solo aves (opcionales)
      species_common_es: z.string().optional(),
      species_common_en: z.string().optional(),
      species_scientific: z.string().optional(),

      location: z
        .object({
          city: z.string().optional(),
          region: z.string().optional(),
          country: z.string().default('Chile'),
        })
        .default({}),

      // Coordenadas GPS (opcional). Si están presentes la foto aparece en /mapa/.
      // El script de ingesta las extrae del EXIF cuando existen.
      coords: z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
        .optional(),

      date_taken: z.coerce.date(),

      camera: z
        .object({
          model: z.string().optional(),
          lens: z.string().optional(),
        })
        .default({}),

      exif: z
        .object({
          aperture: z.string().optional(),
          shutter_speed: z.string().optional(),
          iso: z.union([z.number(), z.string()]).optional(),
          focal_length: z.string().optional(),
        })
        .default({}),

      description_es: z.string().optional(),
      description_en: z.string().optional(),

      featured: z.boolean().default(false),

      // Orden manual (opcional). Las fotos con `order` se muestran primero,
      // ascendente. Las que no tienen `order` van después, por date_taken desc.
      // Lo asigna el gestor `npm run manage` al reordenar por arrastre.
      order: z.number().int().min(0).optional(),

      // Fase futura — siempre false por ahora
      for_sale: z.boolean().default(false),
      price_usd: z.number().positive().optional(),

      // Imagen master watermarkeada en src/assets/photos/[slug].jpg
      // astro:assets genera variantes responsivas en build.
      image: image(),
    }),
});

export const collections = { photos };
