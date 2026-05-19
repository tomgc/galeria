import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getAllPhotos } from '../lib/photos';

// Image sitemap para Google Images. Indexa cada foto con título, caption y
// licencia para que aparezca correctamente atribuida en las búsquedas.
// Referencia: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Astro.site not configured', { status: 500 });
  }
  const photos = await getAllPhotos();

  // Generamos la URL absoluta de la versión 1600px JPEG (la más útil para
  // que Google muestre en sus resultados sin descargar la master de 2400px).
  const entries = await Promise.all(
    photos.map(async (p) => {
      const img = await getImage({
        src: p.data.image,
        format: 'jpg',
        width: Math.min(1600, p.data.image.width),
      });
      const imageUrl = new URL(img.src, site).toString();
      return { photo: p, imageUrl };
    }),
  );

  // Escape mínimo para contenido XML
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // site = https://tomgc.github.io (sin base), import.meta.env.BASE_URL = /galeria/
  const baseUrl = new URL(import.meta.env.BASE_URL, site).toString();

  const urls = entries
    .map(({ photo, imageUrl }) => {
      const data = photo.data;
      const detailUrl = new URL(`es/foto/${photo.id}/`, baseUrl).toString();
      const title = data.title_es;
      const caption = data.description_es || data.title_es;
      const geo = [data.location.city, data.location.region, data.location.country]
        .filter(Boolean)
        .join(', ');

      return `  <url>
    <loc>${xmlEscape(detailUrl)}</loc>
    <image:image>
      <image:loc>${xmlEscape(imageUrl)}</image:loc>
      <image:title>${xmlEscape(title)}</image:title>
      <image:caption>${xmlEscape(caption)}</image:caption>
      ${geo ? `<image:geo_location>${xmlEscape(geo)}</image:geo_location>` : ''}
      <image:license>https://creativecommons.org/licenses/by-nc-nd/4.0/</image:license>
    </image:image>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
