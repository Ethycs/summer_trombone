/**
 * DocumentRoute.js - The shareable-link contract for a single document.
 *
 * Three URLs address the same document:
 *   /articles/<slug>/           canonical publication page (indexed)
 *   /articles/<slug>/terminal/  fullscreen terminal view (noindex, carries the og:image)
 *   /?doc=/articles/<slug>/     alias for the terminal view
 *
 * This module must stay DOM-free and must never read import.meta.env - it is
 * imported directly by the Node test runner, like contentMetadata.js. Callers
 * pass basePath and origin in.
 */
import { canonicalPathForContent, humanizeSourceName, sitePathToHref } from './contentMetadata.js';

const DOC_ROUTE = /^\/(articles|papers)\/[a-z0-9][a-z0-9-]*\/$/;
const TERMINAL_SEGMENT = 'terminal';

/**
 * Coerce any of the forms a document path arrives in - bare slug path, absolute
 * URL, base-path-prefixed, terminal route, percent-encoded - into the single
 * canonical form `/articles/<slug>/`. Returns null for anything that is not a
 * recognisable document route.
 */
export function normalizeDocPath(value, basePath = '/') {
    if (!value) return null;

    let candidate = String(value).trim();
    if (!candidate) return null;

    // Tolerate a full URL being pasted into ?doc=
    if (/^[a-z]+:\/\//i.test(candidate)) {
        try {
            candidate = new URL(candidate).pathname;
        } catch {
            return null;
        }
    }

    try {
        candidate = decodeURIComponent(candidate);
    } catch {
        // Leave malformed escapes as-is; the route check below will reject them.
    }

    candidate = `/${candidate.replace(/^\/+|\/+$/g, '')}/`.replace(/\/{2,}/g, '/');
    if (candidate === '/') return null;

    // Drop a leading base path (GitHub Pages project-site fallback)
    const base = String(basePath || '/').replace(/^\/+|\/+$/g, '');
    if (base && candidate.startsWith(`/${base}/`)) {
        candidate = candidate.slice(base.length + 1);
    }

    // A terminal route addresses the same document as its parent
    const segments = candidate.split('/').filter(Boolean);
    if (segments[segments.length - 1] === TERMINAL_SEGMENT) {
        segments.pop();
        candidate = `/${segments.join('/')}/`;
    }

    return DOC_ROUTE.test(candidate) ? candidate : null;
}

/** Read the ?doc= alias out of a location.search string. */
export function readDocParam(search, basePath = '/') {
    if (!search) return null;
    const raw = new URLSearchParams(search).get('doc');
    return normalizeDocPath(raw, basePath);
}

/** Read the ?mode= override, normalised to a known mode or null. */
export function readModeParam(search) {
    if (!search) return null;
    const mode = new URLSearchParams(search).get('mode');
    if (mode === 'academic') return 'academic';
    if (mode === 'terminal' || mode === 'hacker') return 'hacker';
    return null;
}

/** `/articles/<slug>/` -> `/articles/<slug>/terminal/` */
export function terminalPathFor(canonicalPath) {
    const normalized = normalizeDocPath(canonicalPath);
    return normalized ? `${normalized}${TERMINAL_SEGMENT}/` : null;
}

/**
 * The URL the copy-link buttons hand out: the static terminal carrier page,
 * which is a real file and so can advertise its own og:image to scrapers.
 */
export function buildShareUrl({ canonicalPath, mode, origin = '', basePath = '/' } = {}) {
    const terminalPath = terminalPathFor(canonicalPath);
    if (!terminalPath) return null;

    const href = sitePathToHref(terminalPath, basePath);
    const query = mode === 'academic' ? '?mode=academic' : '';
    const root = String(origin || '').replace(/\/+$/, '');
    return `${root}${href}${query}`;
}

/**
 * The ?doc= alias form. Built by concatenation rather than URLSearchParams so
 * the slashes stay literal (?doc=/articles/x/) instead of percent-escaped.
 */
export function buildDocAliasUrl({ canonicalPath, mode, origin = '', basePath = '/' } = {}) {
    const normalized = normalizeDocPath(canonicalPath);
    if (!normalized) return null;

    const href = sitePathToHref('/', basePath);
    const query = mode === 'academic' ? `?doc=${normalized}&mode=academic` : `?doc=${normalized}`;
    const root = String(origin || '').replace(/\/+$/, '');
    return `${root}${href}${query}`;
}

/**
 * Reverse a canonical route back to the source file that produced it, so the
 * existing viewers (which load by filename) can be reused unchanged.
 */
export function resolveDocToSource(canonicalPath, fileSystem) {
    const target = normalizeDocPath(canonicalPath);
    if (!target || !fileSystem || typeof fileSystem.getAllFilesAsObject !== 'function') return null;

    const { files } = fileSystem.getAllFilesAsObject() || {};
    for (const entry of Object.values(files || {})) {
        if (!entry?.path) continue;

        // Entries loaded without a manifest have no canonicalPath; derive it.
        const entryCanonical = entry.canonicalPath
            || canonicalPathForContent(entry.path, entry.title || humanizeSourceName(entry.path));

        if (normalizeDocPath(entryCanonical) === target) return entry.path;
    }

    return null;
}
