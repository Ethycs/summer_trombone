import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(__dirname, '..', '..');

async function generateSummaries() {
    console.log('Loading summarization model...');
    const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');

    console.log('Reading filesystem.json...');
    const manifestPath = path.join(root, 'system', 'filesystem.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

    console.log('Generating summaries for changed articles...');
    let summariesGenerated = 0;
    let summariesSkipped = 0;
    
    for (const file of Object.values(manifest.files)) {
        if (file.type === 'Markdown Post' || file.type === 'TeX Article') {
            // Check if summary needs to be generated
            const needsSummary = !file.summary || 
                                !file.summary.contentHash || 
                                file.summary.contentHash !== file.contentHash;
            
            if (needsSummary) {
                console.log(`  - Generating summary for ${file.path}`);
                const filePath = path.join(root, file.path);
                const content = await fs.readFile(filePath, 'utf-8');
                const summary = await summarizer(content, {
                    max_length: 50,
                    min_length: 20,
                });
                file.summary = {
                    text: summary[0].summary_text,
                    modified: new Date().toISOString(),
                    contentHash: file.contentHash
                };
                summariesGenerated++;
            } else {
                summariesSkipped++;
            }
        }
    }
    
    console.log(`Summaries generated: ${summariesGenerated}, skipped: ${summariesSkipped}`);

    console.log('Writing updated filesystem.json...');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('Summaries generated successfully!');
}

generateSummaries();
