import type { APIRoute } from 'astro';
import rss from '@astrojs/rss';
import { getImage } from 'astro:assets';
import { getAllPhotos } from '../lib/photos';

// Feed RSS de las últimas fotos. Pensado para lectores de RSS que quieran
// seguir las publicaciones nuevas. Limita a las 30 más recientes para no
// crecer indefinidamente.
export const GET: APIRoute = async (context) => {
  if (!context.site) {
    return new Response('Astro.site not configured', { status: 500 });
  }
  const baseUrl = new URL(import.meta.env.BASE_URL, context.site).toString();
  const photos = (await getAllPhotos()).slice(0, 30);

  const items = await Promise.all(
    photos.map(async (p) => {
      const img = await getImage({
        src: p.data.image,
        format: 'jpg',
        width: Math.min(1200, p.data.image.width),
      });
      const link = new URL(`es/foto/${p.id}/`, baseUrl).toString();
      const imageUrl = new URL(img.src, context.site).toString();

      // Descripción HTML: imagen + caption. RSS readers la renderizan inline.
      const captionHtml = p.data.description_es
        ? `<p>${escapeXml(p.data.description_es)}</p>`
        : '';
      const description = `
<p><img src="${imageUrl}" alt="${escapeXml(p.data.title_es)}" loading="lazy"/></p>
${captionHtml}
<p><a href="${link}">Ver en el sitio →</a></p>
      `.trim();

      return {
        title: p.data.title_es,
        link,
        pubDate: new Date(p.data.date_taken),
        description,
        categories: p.data.tags,
      };
    }),
  );

  return rss({
    title: 'Tomás González Cifuentes — Fotografía de naturaleza',
    description: 'Últimas fotografías de aves y paisajes de Chile y la Patagonia.',
    site: baseUrl,
    items,
    customData: '<language>es-CL</language>',
    stylesheet: undefined,
  });
};

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
