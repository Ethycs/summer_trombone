import { promises as fs } from 'fs';
import path from 'path';
import { render as renderMarkdown } from './js/modules/md.worker.js';
import { TexParser } from './js/modules/TexParser.js';

export function buildArticlesPlugin() {
    return {
        name: 'vite-plugin-build-articles',
        apply: 'build', // Only run during build
        async writeBundle(options, bundle) {
            console.log('[buildArticlesPlugin] Building articles...');

            const outputDir = options.dir || path.resolve(process.cwd(), 'dist');
            const outputFile = path.resolve(outputDir, 'articles.json');

            try {
                const manifestPath = path.resolve(process.cwd(), 'system', 'filesystem.json');
                const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
                const articles = {};
                let cachedArticles = {};

                try {
                    cachedArticles = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
                } catch (e) {
                    // no cache found
                }

                for (const fileData of Object.values(manifest.files)) {
                    const { path: filePath, contentHash } = fileData;
                    const fullPath = path.resolve(process.cwd(), filePath.substring(1));

                    if (cachedArticles[filePath] && cachedArticles[filePath].contentHash === contentHash) {
                        articles[filePath] = cachedArticles[filePath];
                        continue;
                    }

                    const content = await fs.readFile(fullPath, 'utf-8');
                    let html = '';
                    const ext = path.extname(fullPath);

                    if (ext === '.md') {
                        const result = renderMarkdown(content);
                        html = result.html;
                    } else if (ext === '.tex') {
                        const parser = new TexParser();
                        html = parser.parse(content);
                    }

                    if (html) {
                        articles[filePath] = {
                            html,
                            contentHash
                        };
                    }
                }

                console.log(`[buildArticlesPlugin] Processed ${Object.keys(articles).length} articles`);
                console.log(`[buildArticlesPlugin] Writing to: ${outputFile}`);
                
                await fs.mkdir(outputDir, { recursive: true });
                await fs.writeFile(outputFile, JSON.stringify(articles, null, 2));
                
                console.log(`[buildArticlesPlugin] Successfully wrote articles.json to ${outputFile}`);
            } catch (error) {
                console.error('[buildArticlesPlugin] Error:', error);
                throw error; // Re-throw to make build fail
            }
        }
    };
}
