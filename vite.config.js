import { defineConfig } from 'vite';
import { blogSyncPlugin } from './vite-plugin-blog-sync.js';

export default defineConfig({
  plugins: [blogSyncPlugin()],
  server: {
    headers: {
      'Content-Security-Policy': "script-src 'self'; worker-src 'self';"
    },
    watch: {
      // Watch these directories for changes
      include: ['posts/**', 'papers/**', 'drafts/**'],
    },
  },
});
