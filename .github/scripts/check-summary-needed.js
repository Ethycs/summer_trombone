import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(path.resolve(__dirname, '..', '..'), 'system', 'filesystem.json');

// Read the manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Check if any files need summarization
let needsSummarization = false;

for (const file of Object.values(manifest.files)) {
    if (file.type === 'Markdown Post' || file.type === 'TeX Article') {
        const needsSummary = !file.summary || 
                            !file.summary.contentHash || 
                            file.summary.contentHash !== file.contentHash;
        
        if (needsSummary) {
            needsSummarization = true;
            console.log(`File needs summarization: ${file.path}`);
        }
    }
}

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `needed=${needsSummarization}\n`);
}

if (needsSummarization) {
    console.log('Files need summarization');
    process.exit(0);
} else {
    console.log('No files need summarization - skipping model load');
    process.exit(0);
}