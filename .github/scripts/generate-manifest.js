const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const contentRoot = 'blog';
const subdirectories = ['papers', 'posts'];
const outputFile = path.join('system', 'filesystem.json'); // Output to system/filesystem.json

// Load existing manifest to preserve summaries
let existingManifest = {};
if (fs.existsSync(outputFile)) {
    try {
        existingManifest = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    } catch (error) {
        console.warn('Could not parse existing manifest. Starting fresh.');
    }
}

const manifest = {
    files: {},
    lastUpdated: new Date().toISOString()
};

function getGitFirstCommitDate(filePath) {
    try {
        const command = `git log --follow --format=%aD "${filePath}" | tail -n 1`;
        const dateStr = execSync(command).toString().trim();
        return new Date(dateStr).toISOString();
    } catch (error) {
        console.warn(`Could not get first commit date for ${filePath}. Using file creation time.`);
        return fs.statSync(filePath).birthtime.toISOString();
    }
}

function getGitLastCommitDate(filePath) {
    try {
        const command = `git log -1 --format=%aD "${filePath}"`;
        const dateStr = execSync(command).toString().trim();
        return new Date(dateStr).toISOString();
    } catch (error) {
        console.warn(`Could not get last commit date for ${filePath}. Using file modification time.`);
        return fs.statSync(filePath).mtime.toISOString();
    }
}

function getFileId(filePath) {
    return path.relative(process.cwd(), filePath)
        .replace(/\.tex$|\.md$/, '')
        .replace(/[\/\\]/g, '-');
}

console.log(`Starting manifest generation for content inside './${contentRoot}'...`);

subdirectories.forEach(subdir => {
    const searchPath = path.join(process.cwd(), contentRoot, subdir);

    if (!fs.existsSync(searchPath)) {
        console.warn(`Directory not found: ${searchPath}. Skipping.`);
        return;
    }

    const files = fs.readdirSync(searchPath);

    files.forEach(file => {
        const fullFilePath = path.join(searchPath, file);
        const stats = fs.statSync(fullFilePath);

        if (stats.isFile() && (file.endsWith('.tex') || file.endsWith('.md'))) {
            const fileId = getFileId(fullFilePath);
            const virtualPath = `/${contentRoot}/${subdir}/${file}`;

            // Preserve existing summary if available
            const existingEntry = existingManifest.files && existingManifest.files[fileId];
            const existingSummary = existingEntry ? existingEntry.summary : undefined;
            
            manifest.files[fileId] = {
                id: fileId,
                path: virtualPath,
                type: file.endsWith('.tex') ? 'TeX Article' : 'Markdown Post',
                created: getGitFirstCommitDate(fullFilePath),
                modified: getGitLastCommitDate(fullFilePath)
            };
            
            // Add summary if it exists
            if (existingSummary) {
                manifest.files[fileId].summary = existingSummary;
            }
            console.log(`Processed: ${fileId} -> ${virtualPath}`);
        }
    });
});

try {
    fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));
    console.log(`Manifest successfully generated at '${outputFile}'`);
    console.log(JSON.stringify(manifest, null, 2));
} catch (error) {
    console.error(`Error writing manifest file: ${error.message}`);
    process.exit(1);
}