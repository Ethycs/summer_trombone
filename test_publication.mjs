import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    escapeHtml,
    extractContentMetadata,
    sitePathToHref,
    slugifyTitle
} from './js/modules/contentMetadata.js';
import { TexParser } from './js/modules/TexParser.js';

const root = path.dirname(fileURLToPath(import.meta.url));

assert.equal(slugifyTitle('Bayes Can’t Save You From Ignorance'), 'bayes-cant-save-you-from-ignorance');
assert.equal(sitePathToHref('/articles/example/', '/summer_trombone/'), '/summer_trombone/articles/example/');
assert.equal(sitePathToHref('/articles/example/', '/'), '/articles/example/');

const sources = [
    {
        sourcePath: "/blog/posts/Bayes Can't Save You.md",
        filePath: "blog/posts/Bayes Can't Save You.md",
        expectedTitle: 'Bayes Can’t Save You From Ignorance',
        expectedRoute: '/articles/bayes-cant-save-you-from-ignorance/',
        expectedSchema: 'Article'
    },
    {
        sourcePath: '/blog/posts/Green Teaming.md',
        filePath: 'blog/posts/Green Teaming.md',
        expectedTitle: 'Green Teaming',
        expectedRoute: '/articles/green-teaming/',
        expectedSchema: 'Article'
    },
    {
        sourcePath: '/blog/papers/premium_for_that.tex',
        filePath: 'blog/papers/premium_for_that.tex',
        expectedTitle: "AI Doom: There's a Premium for That",
        expectedRoute: '/papers/ai-doom-theres-a-premium-for-that/',
        expectedSchema: 'ScholarlyArticle'
    }
];

for (const source of sources) {
    const content = await readFile(path.join(root, source.filePath), 'utf8');
    const metadata = extractContentMetadata(source.sourcePath, content);
    assert.equal(metadata.title, source.expectedTitle);
    assert.equal(metadata.canonicalPath, source.expectedRoute);
    assert.ok(metadata.description.length >= 40 && metadata.description.length <= 160);
    assert.equal(metadata.author, undefined, `${source.sourcePath} must not publish placeholder authorship`);
}

const paperContent = await readFile(path.join(root, 'blog/papers/premium_for_that.tex'), 'utf8');
const paperMetadata = extractContentMetadata('/blog/papers/premium_for_that.tex', paperContent);
assert.match(paperMetadata.description, /^While experts debate whether P\(doom\) is 1% or 10%/);

const paperHtml = new TexParser().parse(paperContent);
const invalidParagraphBlock = /<p>(?:(?!<\/p>)[\s\S])*<(?:h[1-6]|div|ol|ul|table)\b/i;
assert.doesNotMatch(paperHtml, invalidParagraphBlock, 'TeX block elements must not be nested in paragraphs');
assert.equal((paperHtml.match(/<p>/g) || []).length, (paperHtml.match(/<\/p>/g) || []).length);
assert.match(paperHtml, /class="citation">Grace et al\. \(2018\)<\/a>/);
assert.ok(!paperHtml.includes('[grace2018ai]'), 'citations must use bibliography labels');
assert.match(paperHtml, /motivation—avoiding claims payouts—to create/);
assert.ok(!paperHtml.includes('---'), 'TeX em dashes must be rendered typographically');
assert.match(paperHtml, /Keywords:<\/strong> Existential risk/);

const homepageSource = await readFile(path.join(root, 'index.html'), 'utf8');
const modeToggle = homepageSource.match(/<button id="mode-toggle"[\s\S]*?<\/button>/)?.[0];
assert.ok(modeToggle, 'homepage must include the mode toggle');
assert.doesNotMatch(modeToggle, /<pre\b/, 'the mode-toggle button must contain phrasing content only');
assert.match(modeToggle, /aria-label="Toggle view mode"/);

if (process.argv.includes('--dist')) {
    const requiredFiles = [
        'dist/articles/bayes-cant-save-you-from-ignorance/index.html',
        'dist/articles/green-teaming/index.html',
        'dist/papers/ai-doom-theres-a-premium-for-that/index.html',
        'dist/articles/index.html',
        'dist/papers/index.html',
        'dist/sitemap.xml',
        'dist/robots.txt',
        'dist/articles.json'
    ];

    for (const relativePath of requiredFiles) {
        await readFile(path.join(root, relativePath), 'utf8');
    }

    for (const source of sources) {
        const routePath = source.expectedRoute.replace(/^\//, '');
        const html = await readFile(path.join(root, 'dist', routePath, 'index.html'), 'utf8');
        assert.ok(html.includes(`<title>${escapeHtml(source.expectedTitle)} | Summer Trombone</title>`));
        assert.match(html, /<meta name="description" content="[^"]+">/);
        assert.match(html, /<link rel="canonical" href="https:\/\/summertrombone\.com\//);
        assert.match(html, /<script type="application\/ld\+json">/);
        assert.match(html, /<h1(?:\s|>)/);
        assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${source.expectedRoute} must have one H1`);

        const structuredDataMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        const structuredData = JSON.parse(structuredDataMatch[1]);
        assert.equal(structuredData['@type'], source.expectedSchema);
        assert.equal(structuredData.url, `https://summertrombone.com${source.expectedRoute}`);
    }

    const sitemap = await readFile(path.join(root, 'dist/sitemap.xml'), 'utf8');
    const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    assert.equal(sitemapLocations.length, new Set(sitemapLocations).size, 'sitemap URLs must be unique');
    for (const source of sources) {
        assert.ok(sitemap.includes(`https://summertrombone.com${source.expectedRoute}`));
    }

    const articles = JSON.parse(await readFile(path.join(root, 'dist/articles.json'), 'utf8'));
    for (const source of sources) {
        assert.equal(articles[source.sourcePath].canonicalPath, source.expectedRoute);
    }

    const homepage = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    for (const source of sources) {
        assert.ok(homepage.includes(`href="${source.expectedRoute}"`));
    }
    assert.ok(!homepage.includes('The Hive Mind Paradigm'));
    assert.ok(!homepage.includes('Digital Ghosts'));

    const reader = await readFile(path.join(root, 'dist/reader.html'), 'utf8');
    assert.match(reader, /<meta name="robots" content="noindex,follow">/);
}

console.log(`Validated publication metadata for ${sources.length} sources${process.argv.includes('--dist') ? ' and the generated static output' : ''}.`);
