import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { extractContentMetadata } from '../../js/modules/contentMetadata.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Run `git log` for a content file.
 *
 * `blog/` is a submodule, so its file history lives in the content repository,
 * not this one. Running from the repository root would return nothing - the
 * parent only tracks a commit pointer - and the caller would silently fall back
 * to filesystem timestamps, which on a CI runner are the checkout time. So the
 * command runs with its working directory inside the content root and a path
 * relative to it. That also works when blog/ is an ordinary directory.
 *
 * Returns the commit dates newest-first, or an empty array.
 */
function gitLogDates(filePath, extraArgs = []) {
    const contentDir = path.join(process.cwd(), contentRoot);
    const relativePath = path.relative(contentDir, filePath).split(path.sep).join('/');

    try {
        const output = execSync(
            `git log ${extraArgs.join(' ')} --format=%aD -- "${relativePath}"`,
            { cwd: contentDir, stdio: ['ignore', 'pipe', 'pipe'] }
        ).toString().trim();

        return output ? output.split('\n').map(line => line.trim()).filter(Boolean) : [];
    } catch (error) {
        console.warn(`git log failed for ${relativePath}: ${error.message}`);
        return [];
    }
}

function toIso(dateStr) {
    const parsed = new Date(dateStr);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getGitFirstCommitDate(filePath) {
    // Oldest commit that touched the file, following it across renames.
    const dates = gitLogDates(filePath, ['--follow']);
    const first = dates.length ? toIso(dates[dates.length - 1]) : null;

    if (first) return first;

    console.warn(`No git history for ${filePath}; falling back to filesystem creation time. `
        + 'On a CI runner that is the checkout time, not the authoring date.');
    return fs.statSync(filePath).birthtime.toISOString();
}

function getGitLastCommitDate(filePath) {
    const dates = gitLogDates(filePath, ['-1']);
    const last = dates.length ? toIso(dates[0]) : null;

    if (last) return last;

    console.warn(`No git history for ${filePath}; falling back to filesystem modification time.`);
    return fs.statSync(filePath).mtime.toISOString();
}

function getFileId(filePath) {
    return path.relative(process.cwd(), filePath)
        .replace(/\.tex$|\.md$/, '')
        .replace(/[\/\\]/g, '-');
}

function getFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
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
            const currentHash = getFileHash(fullFilePath);
            const content = fs.readFileSync(fullFilePath, 'utf8');
            const publication = extractContentMetadata(virtualPath, content);

            // Check existing entry
            const existingEntry = existingManifest.files && existingManifest.files[fileId];
            const contentChanged = !existingEntry || existingEntry.contentHash !== currentHash;
            
            manifest.files[fileId] = {
                id: fileId,
                path: virtualPath,
                type: file.endsWith('.tex') ? 'TeX Article' : 'Markdown Post',
                created: existingEntry ? existingEntry.created : getGitFirstCommitDate(fullFilePath),
                modified: contentChanged ? new Date().toISOString() : (existingEntry ? existingEntry.modified : getGitLastCommitDate(fullFilePath)),
                contentHash: currentHash,
                title: publication.title,
                description: publication.description,
                canonicalPath: publication.canonicalPath,
                schemaType: publication.schemaType,
                ...(publication.author ? { author: publication.author } : {}),
                ...(publication.datePublished ? { datePublished: publication.datePublished } : {})
            };
            
            // Preserve summary if content hasn't changed
            if (existingEntry && existingEntry.summary && !contentChanged) {
                manifest.files[fileId].summary = existingEntry.summary;
                console.log(`Preserved: ${fileId} (content unchanged)`);
            } else if (existingEntry && contentChanged) {
                console.log(`Changed: ${fileId} (content hash changed)`);
                // Summary will be generated by summarize-manifest.js
                // But preserve old summary until new one is generated
                if (existingEntry.summary) {
                    manifest.files[fileId].summary = existingEntry.summary;
                }
            } else {
                console.log(`New: ${fileId}`);
            }
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
