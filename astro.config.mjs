// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tomgc.github.io',
  base: '/galeria',
  trailingSlash: 'always',
  output: 'static',
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-CL', en: 'en-US' },
      },
    }),
  ],
  image: {
    // astro:assets usa sharp por defecto en builds estáticos
    responsiveStyles: true,
  },
  build: {
    assets: '_assets',
  },
});
