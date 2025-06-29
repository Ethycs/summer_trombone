import { defineConfig } from 'vite';
import { blogSyncPlugin } from './vite-plugin-blog-sync.js';
import { runScriptsPlugin } from './vite-plugin-run-scripts.js';

export default defineConfig({
  plugins: [blogSyncPlugin(), runScriptsPlugin()],
  server: {
    headers: {
      'Content-Security-Policy': "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:; font-src 'self' https://cdn.jsdelivr.net;"
    },
    watch: {
      // Watch these directories for changes
      include: ['posts/**', 'papers/**', 'drafts/**'],
    },
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/filesystem.json') {
          req.url = '/system/filesystem.json';
        }
        next();
      });
    }
  },
});
