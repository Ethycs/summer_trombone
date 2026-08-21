import { promises as fs } from 'fs';
import path from 'path';
import { render as renderMarkdown } from './js/modules/md.worker.js';
import { TexParser } from './js/modules/TexParser.js';
import {
    escapeHtml,
    extractContentMetadata,
    sitePathToHref
} from './js/modules/contentMetadata.js';

const DEFAULT_SITE_URL = 'https://summertrombone.com';
const HOMEPAGE_START = '<!-- STATIC_PUBLICATIONS_START -->';
const HOMEPAGE_END = '<!-- STATIC_PUBLICATIONS_END -->';

function normalizeSiteUrl(value) {
    return String(value || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
}

async function resolveSiteUrl() {
    if (process.env.VITE_SITE_URL) return normalizeSiteUrl(process.env.VITE_SITE_URL);

    try {
        const cname = (await fs.readFile(path.resolve(process.cwd(), 'CNAME'), 'utf8')).trim();
        if (cname) return normalizeSiteUrl(`https://${cname}`);
    } catch {
        // The custom-domain file is optional for GitHub Pages forks.
    }

    return DEFAULT_SITE_URL;
}

function normalizeRenderedHeading(html, metadata) {
    if (/<h1(?:\s|>)/i.test(html)) return html;

    const texTitle = /<div class="article-title">([\s\S]*?)<\/div>/i;
    if (texTitle.test(html)) {
        return html.replace(texTitle, '<h1 class="article-title">$1</h1>');
    }

    return `<h1>${escapeHtml(metadata.title)}</h1>\n${html}`;
}

function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

function canonicalUrl(siteUrl, canonicalPath) {
    return `${siteUrl}${canonicalPath}`;
}

function renderStructuredData(record, siteUrl) {
    const url = canonicalUrl(siteUrl, record.canonicalPath);
    const data = {
        '@context': 'https://schema.org',
        '@type': record.schemaType,
        headline: record.title,
        description: record.description,
        url,
        mainEntityOfPage: url,
        isPartOf: {
            '@type': 'WebSite',
            name: 'Summer Trombone',
            url: `${siteUrl}/`
        },
        ...(record.author ? {
            author: {
                '@type': 'Person',
                name: record.author
            }
        } : {}),
        ...(record.datePublished ? { datePublished: record.datePublished } : {})
    };

    return safeJson(data);
}

function renderNavigation(basePath) {
    return `
        <header class="publication-header">
            <nav class="publication-nav" aria-label="Publication navigation">
                <a class="publication-home" href="${sitePathToHref('/', basePath)}">Summer Trombone</a>
                <a href="${sitePathToHref('/articles/', basePath)}">Articles</a>
                <a href="${sitePathToHref('/papers/', basePath)}">Papers</a>
            </nav>
        </header>`;
}

function renderDocumentPage(record, publicationCss, siteUrl, basePath) {
    const url = canonicalUrl(siteUrl, record.canonicalPath);
    const indexPath = record.contentType === 'paper' ? '/papers/' : '/articles/';
    const typeLabel = record.contentType === 'paper' ? 'Research paper' : 'Article';
    const dateMeta = record.datePublished
        ? `<meta property="article:published_time" content="${escapeHtml(record.datePublished)}">`
        : '';
    const visibleMeta = [typeLabel, record.datePublished, record.author].filter(Boolean).join(' · ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(record.title)} | Summer Trombone</title>
    <meta name="description" content="${escapeHtml(record.description)}">
    <link rel="canonical" href="${escapeHtml(url)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Summer Trombone">
    <meta property="og:title" content="${escapeHtml(record.title)}">
    <meta property="og:description" content="${escapeHtml(record.description)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    ${dateMeta}
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(record.title)}">
    <meta name="twitter:description" content="${escapeHtml(record.description)}">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <style>${publicationCss}</style>
    <script type="application/ld+json">${renderStructuredData(record, siteUrl)}</script>
</head>
<body>
    ${renderNavigation(basePath)}
    <main class="publication-main">
        <article class="publication-content">
            <p class="publication-meta">${escapeHtml(visibleMeta)}</p>
            ${record.html}
        </article>
        <p><a href="${sitePathToHref(indexPath, basePath)}">← Back to all ${record.contentType === 'paper' ? 'papers' : 'articles'}</a></p>
    </main>
    <footer class="publication-footer">Summer Trombone · AI safety, epistemology, and risk research</footer>
    ${record.contentType === 'paper' ? `
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.querySelector('.publication-content'))"></script>` : ''}
</body>
</html>
`;
}

function renderIndexStructuredData(records, title, canonical, siteUrl) {
    return safeJson({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        url: canonical,
        isPartOf: {
            '@type': 'WebSite',
            name: 'Summer Trombone',
            url: `${siteUrl}/`
        },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: records.map((record, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: record.title,
                url: canonicalUrl(siteUrl, record.canonicalPath)
            }))
        }
    });
}

function renderIndexPage(records, contentType, publicationCss, siteUrl, basePath) {
    const isPapers = contentType === 'paper';
    const collectionPath = isPapers ? '/papers/' : '/articles/';
    const title = isPapers ? 'Research Papers' : 'Articles';
    const description = isPapers
        ? 'Research papers on AI risk, insurance economics, safety, and resilience.'
        : 'Long-form articles on Bayesian epistemology, AI safety, catastrophic risk, and resilience.';
    const canonical = canonicalUrl(siteUrl, collectionPath);

    const cards = records.map(record => `
            <li class="publication-card">
                <article>
                    <h2><a href="${sitePathToHref(record.canonicalPath, basePath)}">${escapeHtml(record.title)}</a></h2>
                    ${record.datePublished ? `<p class="publication-meta"><time datetime="${escapeHtml(record.datePublished)}">${escapeHtml(record.datePublished)}</time></p>` : ''}
                    <p>${escapeHtml(record.description)}</p>
                </article>
            </li>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Summer Trombone</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Summer Trombone">
    <meta property="og:title" content="${title} | Summer Trombone">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta name="twitter:card" content="summary">
    <style>${publicationCss}</style>
    <script type="application/ld+json">${renderIndexStructuredData(records, title, canonical, siteUrl)}</script>
</head>
<body>
    ${renderNavigation(basePath)}
    <main class="publication-main publication-index">
        <h1>${title}</h1>
        <p class="publication-description">${escapeHtml(description)}</p>
        <ul class="publication-list">${cards}
        </ul>
    </main>
    <footer class="publication-footer">Summer Trombone · AI safety, epistemology, and risk research</footer>
</body>
</html>
`;
}

function renderHomepageCards(records, basePath) {
    return records.slice(0, 3).map(record => {
        const label = record.contentType === 'paper' ? 'PAPER' : 'ARTICLE';
        const date = record.datePublished || record.sortDate?.slice(0, 10) || 'CURRENT';
        return `
                <article class="post-content" data-path="${escapeHtml(record.sourcePath)}">
                    <h2 class="post-title"><a href="${sitePathToHref(record.canonicalPath, basePath)}">${escapeHtml(record.title)}</a></h2>
                    <div class="post-meta"><span class="prompt">[${label}]</span> ${escapeHtml(date)}</div>
                    <p class="terminal-text">${escapeHtml(record.description)}</p>
                    <p><a href="${sitePathToHref(record.canonicalPath, basePath)}">[Continue reading...]</a></p>
                </article>`;
    }).join('\n');
}

async function updateHomepage(outputDir, records, basePath) {
    const homepagePath = path.join(outputDir, 'index.html');
    let homepage = await fs.readFile(homepagePath, 'utf8');
    const start = homepage.indexOf(HOMEPAGE_START);
    const end = homepage.indexOf(HOMEPAGE_END);

    if (start < 0 || end < start) {
        throw new Error('Homepage publication markers are missing or out of order.');
    }

    const replacement = `${HOMEPAGE_START}${renderHomepageCards(records, basePath)}\n                ${HOMEPAGE_END}`;
    homepage = `${homepage.slice(0, start)}${replacement}${homepage.slice(end + HOMEPAGE_END.length)}`;
    await fs.writeFile(homepagePath, homepage);
}

function renderSitemap(records, siteUrl) {
    const staticPaths = ['/', '/articles/', '/papers/'];
    const urls = [
        ...staticPaths.map(canonicalPath => ({ canonicalPath })),
        ...records
    ];

    const entries = urls.map(record => {
        const lastModified = record.datePublished || record.sortDate?.slice(0, 10);
        return `  <url>\n    <loc>${escapeHtml(canonicalUrl(siteUrl, record.canonicalPath))}</loc>${lastModified ? `\n    <lastmod>${escapeHtml(lastModified)}</lastmod>` : ''}\n  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function writePage(outputDir, canonicalPath, html) {
    const relativeDirectory = canonicalPath.replace(/^\/+|\/+$/g, '');
    const targetDirectory = path.resolve(outputDir, relativeDirectory);
    const relativeTarget = path.relative(path.resolve(outputDir), targetDirectory);

    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
        throw new Error(`Refusing to write publication outside output directory: ${canonicalPath}`);
    }

    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(path.join(targetDirectory, 'index.html'), html);
}

export function buildArticlesPlugin() {
    let resolvedConfig;

    return {
        name: 'vite-plugin-build-articles',
        apply: 'build',
        configResolved(config) {
            resolvedConfig = config;
        },
        async writeBundle(options) {
            console.log('[buildArticlesPlugin] Building static publication layer...');

            const outputDir = path.resolve(options.dir || resolvedConfig?.build?.outDir || 'dist');
            const outputFile = path.join(outputDir, 'articles.json');
            const basePath = resolvedConfig?.base || '/';

            try {
                const manifestPath = path.resolve(process.cwd(), 'system', 'filesystem.json');
                const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
                const publicationCss = await fs.readFile(path.resolve(process.cwd(), 'css', 'publication.css'), 'utf8');
                const siteUrl = await resolveSiteUrl();
                const articles = {};
                const records = [];

                for (const fileData of Object.values(manifest.files)) {
                    const { path: sourcePath, contentHash } = fileData;
                    if (!/\/blog\/(posts|papers)\/.*\.(md|tex)$/i.test(sourcePath)) continue;

                    const fullPath = path.resolve(process.cwd(), sourcePath.replace(/^\//, ''));
                    const content = await fs.readFile(fullPath, 'utf8');
                    const metadata = extractContentMetadata(sourcePath, content);
                    const ext = path.extname(fullPath).toLowerCase();
                    let html = '';

                    if (ext === '.md') {
                        html = renderMarkdown(content).html;
                    } else if (ext === '.tex') {
                        html = new TexParser().parse(content);
                    }

                    if (!html) continue;

                    const record = {
                        sourcePath,
                        html: normalizeRenderedHeading(html, metadata),
                        contentHash,
                        sortDate: metadata.datePublished || fileData.modified || fileData.created,
                        ...metadata
                    };

                    records.push(record);
                    articles[sourcePath] = {
                        html: record.html,
                        contentHash,
                        title: record.title,
                        description: record.description,
                        canonicalPath: record.canonicalPath,
                        contentType: record.contentType,
                        schemaType: record.schemaType,
                        ...(record.author ? { author: record.author } : {}),
                        ...(record.datePublished ? { datePublished: record.datePublished } : {})
                    };
                }

                records.sort((left, right) => String(right.sortDate || '').localeCompare(String(left.sortDate || '')));
                const articlesIndex = records.filter(record => record.contentType === 'article');
                const papersIndex = records.filter(record => record.contentType === 'paper');

                await fs.mkdir(outputDir, { recursive: true });
                await fs.writeFile(outputFile, JSON.stringify(articles, null, 2));

                for (const record of records) {
                    await writePage(outputDir, record.canonicalPath, renderDocumentPage(record, publicationCss, siteUrl, basePath));
                }

                await writePage(outputDir, '/articles/', renderIndexPage(articlesIndex, 'article', publicationCss, siteUrl, basePath));
                await writePage(outputDir, '/papers/', renderIndexPage(papersIndex, 'paper', publicationCss, siteUrl, basePath));
                await fs.writeFile(path.join(outputDir, 'sitemap.xml'), renderSitemap(records, siteUrl));
                await fs.writeFile(path.join(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
                await updateHomepage(outputDir, records, basePath);

                console.log(`[buildArticlesPlugin] Published ${records.length} canonical documents.`);
                console.log(`[buildArticlesPlugin] Wrote indexes, sitemap.xml, robots.txt, and ${outputFile}.`);
            } catch (error) {
                console.error('[buildArticlesPlugin] Error:', error);
                throw error;
            }
        }
    };
}
