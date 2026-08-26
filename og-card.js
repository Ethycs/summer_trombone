/**
 * og-card.js - Social preview cards, drawn as a terminal window.
 *
 * Kept free of the rasterizer so the layout logic is unit-testable: the build
 * plugin feeds renderOgCardSvg() into resvg. Two constraints from resvg shape
 * this file:
 *   - it performs no text layout, so every line must be positioned explicitly
 *     (hence wrapText below rather than any wrapping attribute);
 *   - it does not support <foreignObject>, so no HTML-in-SVG shortcuts.
 */
import { escapeHtml } from './js/modules/contentMetadata.js';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const COLORS = {
    background: '#0a0a0a',
    border: '#00ff66',
    green: '#00ff66',
    bright: '#f0fff8',
    dim: '#4d8f6b',
    titleBar: '#003d1a',
    scanline: 'rgba(0, 255, 102, 0.05)'
};

// Hack is a monospace face; every glyph advances the same fraction of the em.
const ADVANCE_RATIO = 0.6;

function charsThatFit(pixelWidth, fontSize) {
    return Math.max(1, Math.floor(pixelWidth / (fontSize * ADVANCE_RATIO)));
}

/**
 * Greedy word wrap into at most `maxLines` lines, ellipsising any overflow.
 * Words longer than a line are hard-split rather than allowed to overhang.
 */
export function wrapText(text, maxCharsPerLine, maxLines = Infinity) {
    const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const limit = Math.max(1, Math.floor(maxCharsPerLine));
    const lines = [];
    let current = '';

    const pushCurrent = () => {
        if (current) lines.push(current);
        current = '';
    };

    for (const word of normalized.split(' ')) {
        let pending = word;

        // A single word too long for any line: break it across lines.
        while (pending.length > limit) {
            pushCurrent();
            lines.push(pending.slice(0, limit));
            pending = pending.slice(limit);
            if (lines.length >= maxLines) break;
        }

        if (lines.length >= maxLines) break;
        if (!pending) continue;

        if (!current) {
            current = pending;
        } else if (current.length + 1 + pending.length <= limit) {
            current += ` ${pending}`;
        } else {
            pushCurrent();
            if (lines.length >= maxLines) break;
            current = pending;
        }
    }

    if (lines.length < maxLines) pushCurrent();

    if (!Number.isFinite(maxLines)) return lines;

    const clipped = lines.slice(0, maxLines);
    const droppedContent = lines.length > maxLines
        || clipped.join(' ').length < normalized.length;

    if (droppedContent && clipped.length) {
        const last = clipped[clipped.length - 1];
        const trimmed = last.length >= limit ? last.slice(0, Math.max(0, limit - 1)) : last;
        clipped[clipped.length - 1] = `${trimmed.replace(/[\s,;:.!?-]+$/, '')}…`;
    }

    return clipped;
}

function textElement(content, { x, y, size, fill, weight = 'normal', anchor = 'start' }) {
    return `<text x="${x}" y="${y}" font-family="Hack, monospace" font-size="${size}" `
        + `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" `
        + `xml:space="preserve">${escapeHtml(content)}</text>`;
}

function multilineElement(lines, { x, y, size, lineHeight, fill, weight = 'normal' }) {
    return lines
        .map((line, index) => textElement(line, {
            x,
            y: y + index * lineHeight,
            size,
            fill,
            weight
        }))
        .join('\n    ');
}

/**
 * Render one social card. `record` is a build record: title, description,
 * contentType, optional datePublished and sourcePath.
 */
export function renderOgCardSvg(record = {}) {
    const {
        title = 'Summer Trombone',
        description = '',
        contentType = 'article',
        datePublished,
        sourcePath
    } = record;

    const frame = { x: 40, y: 40, width: CARD_WIDTH - 80, height: CARD_HEIGHT - 80 };
    const titleBarHeight = 48;
    const padding = 44;
    const contentX = frame.x + padding;
    const contentWidth = frame.width - padding * 2;

    const typeLabel = contentType === 'paper' ? '[PAPER]' : '[POST]';
    const filename = sourcePath ? String(sourcePath).split('/').pop() : '';
    const promptLine = filename ? `$ cat "${filename}"` : '$ cat --latest';

    const titleSize = 58;
    const titleLines = wrapText(title, charsThatFit(contentWidth, titleSize), 3);

    const descriptionSize = 22;
    const descriptionLines = wrapText(description, charsThatFit(contentWidth, descriptionSize), 2);

    const metaParts = [typeLabel, datePublished].filter(Boolean);

    // Content flows from the top like a real terminal session; meta is pinned
    // to the bottom edge.
    const promptY = frame.y + titleBarHeight + 74;
    const titleY = promptY + 84;
    const titleBlockHeight = Math.max(0, titleLines.length - 1) * 70;
    const descriptionY = titleY + titleBlockHeight + 74;
    const descriptionBlockHeight = Math.max(0, descriptionLines.length - 1) * 32;
    const metaY = frame.y + frame.height - 46;

    // A waiting prompt closes the session and fills the space a short title
    // would otherwise leave empty. Dropped if it would crowd the meta line.
    const cursorY = descriptionY + descriptionBlockHeight + 62;
    const cursorFits = cursorY < metaY - 40;
    const cursorBlock = cursorFits
        ? `${textElement('$', { x: contentX, y: cursorY, size: 26, fill: COLORS.green })}
    <rect x="${contentX + 26}" y="${cursorY - 20}" width="14" height="26" fill="${COLORS.green}"/>`
        : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="4" height="2" fill="${COLORS.scanline}"/>
    </pattern>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${COLORS.background}"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#scanlines)"/>

  <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"
        fill="none" stroke="${COLORS.border}" stroke-width="2"/>
  <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${titleBarHeight}"
        fill="${COLORS.titleBar}"/>
  <line x1="${frame.x}" y1="${frame.y + titleBarHeight}" x2="${frame.x + frame.width}"
        y2="${frame.y + titleBarHeight}" stroke="${COLORS.border}" stroke-width="2"/>

  <g>
    ${textElement('summertrombone@wintermute: ~/blog', {
        x: frame.x + 20,
        y: frame.y + 32,
        size: 22,
        fill: COLORS.bright,
        weight: 'bold'
    })}
    ${textElement('_  □  ×', {
        x: frame.x + frame.width - 20,
        y: frame.y + 32,
        size: 22,
        fill: COLORS.green,
        anchor: 'end'
    })}
  </g>

  <g>
    ${textElement(promptLine, { x: contentX, y: promptY, size: 26, fill: COLORS.dim })}
    ${multilineElement(titleLines, {
        x: contentX,
        y: titleY,
        size: titleSize,
        lineHeight: 70,
        fill: COLORS.bright,
        weight: 'bold'
    })}
    ${multilineElement(descriptionLines, {
        x: contentX,
        y: descriptionY,
        size: descriptionSize,
        lineHeight: 32,
        fill: COLORS.dim
    })}
    ${cursorBlock}
    ${textElement(metaParts.join('  ·  '), {
        x: contentX,
        y: metaY,
        size: 24,
        fill: COLORS.green
    })}
    ${textElement('summertrombone.com', {
        x: frame.x + frame.width - padding,
        y: metaY,
        size: 24,
        fill: COLORS.dim,
        anchor: 'end'
    })}
  </g>
</svg>
`;
}

/** The generic card used for the homepage and the collection indexes. */
export function renderSiteCardSvg() {
    return renderOgCardSvg({
        title: 'Summer Trombone',
        description: 'Independent long-form research on AI safety, Bayesian epistemology, catastrophic risk, resilience, and insurance economics.',
        contentType: 'article',
        sourcePath: null
    });
}

/** Stable image filename for a canonical route: /articles/green-teaming/ -> green-teaming.png */
export function ogImageNameFor(canonicalPath) {
    const slug = String(canonicalPath || '').replace(/^\/+|\/+$/g, '').split('/').pop();
    return `${slug || 'site'}.png`;
}
