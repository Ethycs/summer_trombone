const PLACEHOLDER_AUTHOR = /anonymous author|your name|your group|consortium|institution affiliation|department of/i;

function collapseWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function sourceFilename(sourcePath) {
    return String(sourcePath || '').split('/').pop() || 'untitled';
}

export function humanizeSourceName(sourcePath) {
    return sourceFilename(sourcePath)
        .replace(/\.(md|tex)$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function slugifyTitle(value) {
    return collapseWhitespace(value)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled';
}

export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripMarkdown(value) {
    return collapseWhitespace(String(value || '')
        .replace(/<!--([\s\S]*?)-->/g, ' ')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+[.)]\s+/gm, '')
        .replace(/[>*_~]/g, '')
        .replace(/<[^>]+>/g, ' '));
}

function stripTex(value) {
    let text = String(value || '')
        .replace(/(?<!\\)%.*$/gm, ' ')
        .replace(/\\([%$&#_])/g, '$1')
        .replace(/\\(?:cite|citep|citet|ref|label|url|href)\*?(?:\[[^\]]*\])?\{[^}]*\}/g, ' ')
        .replace(/\\(?:textbf|textit|emph|texttt|large|small)\*?\{([^{}]*)\}/g, '$1');

    for (let index = 0; index < 3; index += 1) {
        text = text.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^{}]*)\}/g, '$1');
    }

    return collapseWhitespace(text
        .replace(/\\[a-zA-Z]+\*?/g, ' ')
        .replace(/\\\\/g, ' ')
        .replace(/[{}$]/g, ' ')
        .replace(/---/g, '—')
        .replace(/~/g, ' '));
}

function limitDescription(value, maximum = 160) {
    const text = collapseWhitespace(value);
    if (text.length <= maximum) return text;

    const shortened = text.slice(0, maximum - 1);
    const lastSpace = shortened.lastIndexOf(' ');
    const boundary = lastSpace > maximum * 0.7 ? lastSpace : shortened.length;
    return `${shortened.slice(0, boundary).replace(/[,:;.!?\s]+$/g, '')}…`;
}

function normalizeDate(value) {
    const candidate = collapseWhitespace(value);
    if (!candidate || /\\today|today/i.test(candidate)) return undefined;

    const timestamp = Date.parse(candidate);
    if (Number.isNaN(timestamp)) return undefined;
    return new Date(timestamp).toISOString().slice(0, 10);
}

function cleanAuthor(value, cleaner) {
    const author = cleaner(value);
    if (!author || PLACEHOLDER_AUTHOR.test(author)) return undefined;
    return author;
}

function extractMarkdownDescription(content) {
    const blocks = String(content || '').split(/\r?\n\s*\r?\n/);
    const abstractIndex = blocks.findIndex(block => /^\s*\*\*Abstract:\*\*\s*$/i.test(block));
    const candidates = abstractIndex >= 0 ? blocks.slice(abstractIndex + 1) : blocks;

    for (const block of candidates) {
        const trimmed = block.trim();
        if (!trimmed
            || /^#{1,6}\s/.test(trimmed)
            || /^---+$/.test(trimmed)
            || /^```/.test(trimmed)
            || /^\*\*(Date|Version|Authored By|Abstract):/i.test(trimmed)
            || /^\*\*[^*]+\*\*$/.test(trimmed)) {
            continue;
        }

        const description = stripMarkdown(trimmed);
        if (description.length >= 40) return limitDescription(description);
    }

    return '';
}

function extractTexTitle(content, fallback) {
    const match = String(content || '').match(/\\title\{([\s\S]*?)\}/);
    if (!match) return fallback;

    const primaryTitle = match[1].split(/\\\\/)[0];
    return stripTex(primaryTitle) || fallback;
}

function extractTexDescription(content) {
    const match = String(content || '').match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
    return match ? limitDescription(stripTex(match[1])) : '';
}

export function canonicalPathForContent(sourcePath, title) {
    const isPaper = /\/papers\//i.test(sourcePath) || /\.tex$/i.test(sourcePath);
    const collection = isPaper ? 'papers' : 'articles';
    return `/${collection}/${slugifyTitle(title)}/`;
}

export function sitePathToHref(sitePath, basePath = '/') {
    if (/^[a-z]+:/i.test(sitePath)) return sitePath;

    const base = `/${String(basePath || '/').replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');
    const route = `/${String(sitePath || '/').replace(/^\/+/, '')}`;
    return `${base}${route}`.replace(/\/{2,}/g, '/');
}

export function extractContentMetadata(sourcePath, content = '') {
    const fallbackTitle = humanizeSourceName(sourcePath);
    const isPaper = /\/papers\//i.test(sourcePath) || /\.tex$/i.test(sourcePath);

    if (isPaper) {
        const title = extractTexTitle(content, fallbackTitle);
        const authorMatch = String(content || '').match(/\\author\{([\s\S]*?)\}/);
        const dateMatch = String(content || '').match(/\\date\{([\s\S]*?)\}/);
        const author = authorMatch ? cleanAuthor(authorMatch[1], stripTex) : undefined;
        const datePublished = dateMatch ? normalizeDate(stripTex(dateMatch[1])) : undefined;

        return {
            title,
            description: extractTexDescription(content) || `Research paper: ${title}.`,
            canonicalPath: canonicalPathForContent(sourcePath, title),
            contentType: 'paper',
            schemaType: 'ScholarlyArticle',
            ...(author ? { author } : {}),
            ...(datePublished ? { datePublished } : {})
        };
    }

    const h1Match = String(content || '').match(/^#\s+(.+)$/m);
    const title = h1Match ? stripMarkdown(h1Match[1]) : fallbackTitle;
    const authorMatch = String(content || '').match(/^\*\*Authored By:\*\*\s*(.+)$/im);
    const dateMatch = String(content || '').match(/^\*\*Date:\*\*\s*(.+)$/im);
    const author = authorMatch ? cleanAuthor(authorMatch[1], stripMarkdown) : undefined;
    const datePublished = dateMatch ? normalizeDate(dateMatch[1]) : undefined;

    return {
        title,
        description: extractMarkdownDescription(content) || `Article: ${title}.`,
        canonicalPath: canonicalPathForContent(sourcePath, title),
        contentType: 'article',
        schemaType: 'Article',
        ...(author ? { author } : {}),
        ...(datePublished ? { datePublished } : {})
    };
}
