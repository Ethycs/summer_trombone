import { defineConfig } from 'vite';
import { blogSyncPlugin } from './vite-plugin-blog-sync.js';

export default defineConfig({
  plugins: [blogSyncPlugin()],
  server: {
    watch: {
      // Watch these directories for changes
      include: ['posts/**', 'papers/**', 'drafts/**'],
    },
  },
});
