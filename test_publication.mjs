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
import {
    buildDocAliasUrl,
    buildShareUrl,
    normalizeDocPath,
    readDocParam,
    readModeParam,
    resolveDocToSource,
    terminalPathFor
} from './js/modules/DocumentRoute.js';
import { ogImageNameFor, renderOgCardSvg, wrapText } from './og-card.js';

const root = path.dirname(fileURLToPath(import.meta.url));

assert.equal(slugifyTitle('Bayes Can’t Save You From Ignorance'), 'bayes-cant-save-you-from-ignorance');
assert.equal(sitePathToHref('/articles/example/', '/summer_trombone/'), '/summer_trombone/articles/example/');
assert.equal(sitePathToHref('/articles/example/', '/'), '/articles/example/');

// --- Share-link routing ---------------------------------------------------

// Every form a document path can arrive in normalises to one canonical route.
for (const variant of [
    '/articles/green-teaming/',
    'articles/green-teaming',
    '/articles/green-teaming',
    '%2Farticles%2Fgreen-teaming%2F',
    '/articles/green-teaming/terminal/',
    'https://summertrombone.com/articles/green-teaming/'
]) {
    assert.equal(normalizeDocPath(variant), '/articles/green-teaming/', `failed to normalize ${variant}`);
}

assert.equal(normalizeDocPath('/summer_trombone/articles/green-teaming/', '/summer_trombone/'), '/articles/green-teaming/');
assert.equal(normalizeDocPath('/not-a-collection/green-teaming/'), null);
assert.equal(normalizeDocPath('/articles/'), null);
assert.equal(normalizeDocPath(''), null);
assert.equal(normalizeDocPath(undefined), null);

assert.equal(terminalPathFor('/articles/green-teaming/'), '/articles/green-teaming/terminal/');
assert.equal(terminalPathFor('/papers/ai-doom/'), '/papers/ai-doom/terminal/');
assert.equal(terminalPathFor('/nope/'), null);

// The copy button hands out the static carrier page, which can carry og:image.
assert.equal(
    buildShareUrl({ canonicalPath: '/articles/green-teaming/', origin: 'https://summertrombone.com' }),
    'https://summertrombone.com/articles/green-teaming/terminal/'
);
assert.equal(
    buildShareUrl({ canonicalPath: '/papers/ai-doom/', origin: 'https://summertrombone.com', basePath: '/summer_trombone/' }),
    'https://summertrombone.com/summer_trombone/papers/ai-doom/terminal/'
);
assert.equal(
    buildShareUrl({ canonicalPath: '/articles/green-teaming/', mode: 'academic', origin: 'https://summertrombone.com' }),
    'https://summertrombone.com/articles/green-teaming/terminal/?mode=academic'
);

// The ?doc= alias keeps its slashes literal rather than percent-escaped.
const alias = buildDocAliasUrl({ canonicalPath: '/articles/green-teaming/', origin: 'https://summertrombone.com' });
assert.equal(alias, 'https://summertrombone.com/?doc=/articles/green-teaming/');
assert.ok(!alias.includes('%2F'), 'the ?doc= alias must not percent-escape its slashes');

// Both share forms round-trip back to the same canonical route.
for (const url of [
    buildShareUrl({ canonicalPath: '/articles/green-teaming/', origin: 'https://summertrombone.com' }),
    alias,
    buildDocAliasUrl({ canonicalPath: '/articles/green-teaming/', mode: 'academic', origin: 'https://summertrombone.com' })
]) {
    const { search, pathname } = new URL(url);
    const recovered = readDocParam(search) || normalizeDocPath(pathname);
    assert.equal(recovered, '/articles/green-teaming/', `failed to round-trip ${url}`);
}

assert.equal(readModeParam('?doc=/articles/x/&mode=academic'), 'academic');
assert.equal(readModeParam('?mode=terminal'), 'hacker');
assert.equal(readModeParam('?mode=nonsense'), null);
assert.equal(readModeParam(''), null);

// Reversing a canonical route back to the source file the viewers load by name.
const stubFileSystem = {
    getAllFilesAsObject: () => ({
        files: {
            '/blog/posts/Green Teaming.md': {
                path: '/blog/posts/Green Teaming.md',
                canonicalPath: '/articles/green-teaming/'
            },
            // No canonicalPath: must be derived from the title, as in dev.
            '/blog/papers/premium_for_that.tex': {
                path: '/blog/papers/premium_for_that.tex',
                title: "AI Doom: There's a Premium for That"
            }
        }
    })
};

assert.equal(resolveDocToSource('/articles/green-teaming/', stubFileSystem), '/blog/posts/Green Teaming.md');
assert.equal(resolveDocToSource('/papers/ai-doom-theres-a-premium-for-that/', stubFileSystem), '/blog/papers/premium_for_that.tex');
assert.equal(resolveDocToSource('/articles/green-teaming/terminal/', stubFileSystem), '/blog/posts/Green Teaming.md');
assert.equal(resolveDocToSource('/articles/does-not-exist/', stubFileSystem), null);
assert.equal(resolveDocToSource('/articles/green-teaming/', null), null);

// --- Social card ----------------------------------------------------------

assert.deepEqual(wrapText('one two three', 7), ['one two', 'three']);
assert.deepEqual(wrapText('', 10), []);
assert.equal(wrapText('a b c d e f g h i j k', 3, 2).length, 2);
assert.ok(wrapText('a b c d e f g h i j k', 3, 2).at(-1).endsWith('…'), 'clipped text must be ellipsised');
assert.ok(wrapText('supercalifragilistic', 6).every(line => line.length <= 6), 'long words must be hard-split');

const card = renderOgCardSvg({
    title: 'Green Teaming',
    description: 'A description of the article that is long enough to wrap onto a second line of the card.',
    contentType: 'article',
    datePublished: '2026-03-14',
    sourcePath: '/blog/posts/Green Teaming.md'
});

assert.match(card, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="630"/);
assert.ok(card.includes('</svg>'));
assert.ok(card.includes('Green Teaming'), 'the card must render its title');
assert.ok(card.includes('[POST]'));
assert.ok(!card.includes('<foreignObject'), 'resvg cannot render foreignObject');
assert.equal((card.match(/<text /g) || []).length, (card.match(/<\/text>/g) || []).length);

// Titles with markup-significant characters must be escaped into the SVG.
const escapedCard = renderOgCardSvg({ title: 'A <script> & "quotes"', contentType: 'paper' });
assert.ok(!escapedCard.includes('<script>'), 'card titles must be escaped');
assert.ok(escapedCard.includes('&lt;script&gt;'));

assert.equal(ogImageNameFor('/articles/green-teaming/'), 'green-teaming.png');
assert.equal(ogImageNameFor('/papers/ai-doom/'), 'ai-doom.png');

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

        // Social preview: the canonical page must advertise its own card.
        const slug = source.expectedRoute.replace(/^\/|\/$/g, '').split('/').pop();
        const imageUrl = `https://summertrombone.com/og/${slug}.png`;
        assert.ok(html.includes(`<meta property="og:image" content="${imageUrl}">`), `${source.expectedRoute} must set og:image`);
        assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
        assert.equal(structuredData.image, imageUrl);

        // The generated card itself.
        const png = await readFile(path.join(root, 'dist/og', `${slug}.png`));
        assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `og/${slug}.png must be a PNG`);
        assert.ok(png.length > 5000, `og/${slug}.png looks empty (${png.length} bytes)`);

        // The share-link carrier page: real HTML so scrapers can read the card,
        // but noindex and canonicalised so it never competes with the article.
        const terminal = await readFile(path.join(root, 'dist', routePath, 'terminal', 'index.html'), 'utf8');
        assert.match(terminal, /<meta name="robots" content="noindex,follow">/);
        assert.ok(
            terminal.includes(`<link rel="canonical" href="https://summertrombone.com${source.expectedRoute}">`),
            `${source.expectedRoute}terminal/ must canonicalise to the publication page`
        );
        assert.ok(terminal.includes(`<meta property="og:image" content="${imageUrl}">`));
        assert.ok(terminal.includes(`<title>${escapeHtml(source.expectedTitle)} | Summer Trombone</title>`));
        assert.ok(
            terminal.includes(`window.__FOCUS_DOC__ = "${source.expectedRoute}"`),
            `${source.expectedRoute}terminal/ must tell the app which document to open`
        );
        // It boots the real app, not a hand-written shell.
        assert.match(terminal, /<script type="module"[^>]*src="[^"]+"><\/script>/);
        assert.ok(terminal.includes('class="window main-window"') || terminal.includes('main-window'));
    }

    const siteCard = await readFile(path.join(root, 'dist/og/site.png'));
    assert.deepEqual([...siteCard.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], 'og/site.png must be a PNG');

    const sitemap = await readFile(path.join(root, 'dist/sitemap.xml'), 'utf8');
    const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    assert.equal(sitemapLocations.length, new Set(sitemapLocations).size, 'sitemap URLs must be unique');
    assert.ok(
        !sitemapLocations.some(location => location.includes('/terminal/')),
        'noindex terminal pages must not be listed in the sitemap'
    );
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
    assert.match(homepage, /<meta property="og:image" content="https:\/\/summertrombone\.com\/og\/site\.png">/);
    assert.match(homepage, /<meta name="twitter:card" content="summary_large_image">/);
    // The homepage itself must never claim to be a document.
    assert.ok(!homepage.includes('__FOCUS_DOC__'), 'the homepage must not carry a focus document');
    assert.ok(!homepage.includes('noindex'), 'the homepage must stay indexable');

    for (const collection of ['dist/articles/index.html', 'dist/papers/index.html']) {
        const indexHtml = await readFile(path.join(root, collection), 'utf8');
        assert.match(indexHtml, /<meta property="og:image" content="https:\/\/summertrombone\.com\/og\/site\.png">/);
        assert.match(indexHtml, /<meta name="twitter:card" content="summary_large_image">/);
    }

    const reader = await readFile(path.join(root, 'dist/reader.html'), 'utf8');
    assert.match(reader, /<meta name="robots" content="noindex,follow">/);
}

console.log(`Validated publication metadata for ${sources.length} sources${process.argv.includes('--dist') ? ' and the generated static output' : ''}.`);
