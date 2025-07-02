import { promises as fs } from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItTaskLists from 'markdown-it-task-lists';
import markdownItContainer from 'markdown-it-container';
import markdownItKatex from 'markdown-it-katex';
import { TexParser } from './js/modules/TexParser.js';

const md = new MarkdownIt({ linkify: true, typographer: true })
  .use(markdownItAnchor, { permalink: markdownItAnchor.permalink.headerLink() })
  .use(markdownItFootnote)
  .use(markdownItTaskLists, { enabled: true })
  .use(markdownItContainer, 'info')
  .use(markdownItKatex, {
    throwOnError: false,
    displayMode: true,
    fleqn: false,
    output: 'html',
    delimiters: [
      {left: "$$", right: "$$", display: true},
      {left: "$", right: "$", display: false},
      {left: "\\(", right: "\\)", display: false},
      {left: "\\[", right: "\\]", display: true}
    ]
  });

export function buildArticlesPlugin() {
    return {
        name: 'vite-plugin-build-articles',
        async buildStart() {
            if (process.env.NODE_ENV !== 'production') {
                return;
            }

            const outputDir = path.resolve(process.cwd(), 'dist');
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
                        let processedMarkdown = content.replace(/\$\$\s*([^\$]+)\s*\$\$/g, (match, math) => {
                            if (match.includes('\n')) {
                                return match;
                            }
                            return '\n$$\n' + math.trim() + '\n$$\n';
                        });
                        html = md.render(processedMarkdown);
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

                await fs.mkdir(outputDir, { recursive: true });
                await fs.writeFile(outputFile, JSON.stringify(articles, null, 2));
                console.log(`Successfully built ${Object.keys(articles).length} articles to ${outputFile}`);
            } catch (error) {
                console.error('Error building articles:', error);
                process.exit(1);
            }
        }
    };
}
