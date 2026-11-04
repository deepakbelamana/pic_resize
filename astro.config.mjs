import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Set SITE_URL when you deploy (for example in Cloudflare Pages environment
// variables) so canonical links and the sitemap use your real domain.
const site = process.env.SITE_URL || 'https://pictool.in';

export default defineConfig({
  site,
  integrations: [preact(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
