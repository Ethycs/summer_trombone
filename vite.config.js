import { defineConfig } from 'vite';
import { resolve } from 'path';
import { blogSyncPlugin } from './vite-plugin-blog-sync.js';
import { runScriptsPlugin } from './vite-plugin-run-scripts.js';

export default defineConfig({
  plugins: [blogSyncPlugin(), runScriptsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reader: resolve(__dirname, 'reader.html')
      }
    }
  },
  server: {
    headers: {
      'Content-Security-Policy-Report-Only': "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com;"
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
