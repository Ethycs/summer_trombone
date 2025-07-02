import fs from 'fs-extra';
import path from 'path';

export function copyBlogPlugin() {
  return {
    name: 'copy-blog',
    closeBundle: async () => {
      const srcDir = path.resolve('blog');
      const destDir = path.resolve('dist/blog');
      
      // Copy blog directory to dist
      await fs.copy(srcDir, destDir);
      console.log('Copied blog directory to dist/blog');
      
      // Also copy system directory
      const systemSrc = path.resolve('system');
      const systemDest = path.resolve('dist/system');
      await fs.copy(systemSrc, systemDest);
      console.log('Copied system directory to dist/system');
    }
  };
}