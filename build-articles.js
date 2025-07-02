import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import { TexParser } from './js/modules/TexParser.js';

const blogDir = path.resolve(process.cwd(), 'blog');
const outputDir = path.resolve(process.cwd(), 'dist');
const outputFile = path.resolve(outputDir, 'articles.json');

async function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            await getAllFiles(filePath, arrayOfFiles);
        } else {
            arrayOfFiles.push(filePath);
        }
    }

    return arrayOfFiles;
}

async function buildArticles() {
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
                html = marked(content);
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

buildArticles();
