import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      // dev specific config
    };
  } else {
    // command === 'build'
    return {
      build: {
        rollupOptions: {
          input: {
            main: 'index.html',
            markdownWorker: 'js/modules/MarkdownWorker.js'
          },
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name].[ext]`
          }
        }
      }
    };
  }
});
