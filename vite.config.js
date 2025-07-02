import { defineConfig } from 'vite';
import { resolve } from 'path';
import { blogSyncPlugin } from './vite-plugin-blog-sync.js';
import { runScriptsPlugin } from './vite-plugin-run-scripts.js';
import { copyBlogPlugin } from './vite-plugin-copy-blog.js';

// Determine base path based on environment variable or build context
const getBasePath = () => {
  // Check for custom domain environment variable
  if (process.env.VITE_CUSTOM_DOMAIN === 'true') {
    return '/';
  }
  // Default to GitHub Pages path for production
  if (process.env.NODE_ENV === 'production') {
    return '/summer_trombone/';
  }
  // Development
  return '/';
};

export default defineConfig(({ command }) => ({
  base: getBasePath(),
  plugins: [
    blogSyncPlugin(),
    command === 'build' && runScriptsPlugin({
      scripts: ['node build-articles.js']
    }),
    copyBlogPlugin()
  ].filter(Boolean),
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        reader: resolve(__dirname, 'reader.html')
      }
    },
    // Copy static files
    copyPublicDir: true
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['./js/modules/TexParser.worker.js', './js/modules/md.worker.js']
  },
  server: {
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
  }
}));
