import { getCollection, type CollectionEntry } from 'astro:content';

export type Photo = CollectionEntry<'photos'>;

/** Devuelve todas las fotos ordenadas por fecha descendente. */
export async function getAllPhotos(): Promise<Photo[]> {
  const all = await getCollection('photos');
  return all.sort(
    (a, b) => new Date(b.data.date_taken).getTime() - new Date(a.data.date_taken).getTime(),
  );
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
