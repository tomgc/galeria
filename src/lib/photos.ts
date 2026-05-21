import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;

/**
 * Devuelve todas las fotos en orden de presentación:
 *   1. Las que tienen `order` numérico, ascendente (promovidas desde el gestor).
 *   2. El resto por `date_taken` descendente (más recientes primero).
 */
export async function getAllPhotos(): Promise<Photo[]> {
  const all = await getCollection('photos');
  return all.sort((a, b) => {
    const ao = a.data.order;
    const bo = b.data.order;
    if (ao !== undefined && bo !== undefined) return ao - bo;
    if (ao !== undefined) return -1;
    if (bo !== undefined) return 1;
    return new Date(b.data.date_taken).getTime() - new Date(a.data.date_taken).getTime();
  });
}

/** Lista de tags únicos con su conteo. */
export async function getTagsWithCounts(): Promise<{
  tags: string[];
  counts: Record<string, number>;
}> {
  const photos = await getAllPhotos();
  const counts: Record<string, number> = {};
  for (const p of photos) {
    for (const tag of p.data.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return { tags: Object.keys(counts), counts };
}

/** Foto anterior/siguiente para navegación en página de detalle. */
export function siblings(photos: Photo[], current: Photo) {
  const idx = photos.findIndex((p) => p.id === current.id);
  return {
    prev: idx > 0 ? photos[idx - 1] : null,
    next: idx >= 0 && idx < photos.length - 1 ? photos[idx + 1] : null,
  };
}
