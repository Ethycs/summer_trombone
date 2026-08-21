# Static Publication Build

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** `blog/posts/`, `blog/papers/`, Vite production builds, and publication discovery
**Depends on:** [Static Publication Layer](<../01 - Design/00 - Static Publication Layer.md>), [Publication Pipeline](<../03 - Architecture/00 - Publication Pipeline.md>)

The Vite build emits canonical, server-readable HTML for every public Markdown post and TeX paper while retaining `articles.json` for the interactive terminal.

## Non-negotiable constraints

1. Source content remains canonical; generated files under `dist/` are disposable build artifacts.
2. Static and interactive rendering use the same `md.worker.js` and `TexParser.js` implementations.
3. Canonical route generation comes only from `js/modules/contentMetadata.js`.
4. Placeholder authorship is omitted rather than guessed.
5. A production build fails if homepage publication markers are missing or output would escape `dist/`.
6. Generated HTML remains structurally valid: TeX block elements are never wrapped in paragraphs, and interactive controls contain only permitted phrasing content.

## Generated artifacts

| Artifact | Purpose | Source |
| --- | --- | --- |
| `dist/articles/<slug>/index.html` | Canonical Markdown article | Markdown renderer + publication template |
| `dist/papers/<slug>/index.html` | Canonical TeX paper | `TexParser` + publication template |
| `dist/articles/index.html` | Crawlable article collection | Build inventory |
| `dist/papers/index.html` | Crawlable paper collection | Build inventory |
| `dist/articles.json` | Interactive-reader HTML and canonical mapping | Same build inventory |
| `dist/sitemap.xml` | Canonical discovery URLs | Static routes + build inventory |
| `dist/robots.txt` | Crawl permission and sitemap location | Site URL |
| `dist/index.html` publication cards | Current real corpus in initial homepage HTML | Content sorted by publication or modification date |

## Metadata derivation

| Field | Markdown | TeX | Fallback behavior |
| --- | --- | --- | --- |
| Title | First H1 | Primary `\title{}` text | Humanized filename |
| Slug | Normalized title | Normalized primary title | `untitled` only when no usable name exists |
| Description | First meaningful paragraph, preferring Abstract | Abstract environment | `Article: <title>` or `Research paper: <title>` |
| Author | Explicit `Authored By` value | Explicit `\author{}` | Omitted; known placeholder patterns are rejected |
| Publication date | Explicit `Date` value | Explicit non-`\today` date | Omitted |
| Schema | `Article` | `ScholarlyArticle` | Determined by source collection and extension |

Descriptions are plain text, whitespace-normalized, and limited to 160 characters. Slugs remove apostrophes, normalize diacritics, collapse punctuation to hyphens, and remain stable until the canonical source title changes.

## Build sequence

1. `.github/scripts/generate-manifest.js` reads every source and records title, description, canonical path, schema type, hashes, and available dates/authors in `system/filesystem.json`.
2. Vite renders the application entries.
3. `vite-plugin-build-articles.js` reads the manifest and source files, invokes the existing renderer for each source, and normalizes the document to one H1.
4. The plugin writes canonical documents, collection indexes, `articles.json`, `sitemap.xml`, and `robots.txt`.
5. The plugin replaces the content between `STATIC_PUBLICATIONS_START` and `STATIC_PUBLICATIONS_END` in the built homepage with the latest real publications.
6. The copy plugin adds the source blog and manifest required by the interactive interface.

## Runtime navigation

`FileSystemSync` attaches the manifest's title and canonical path to every virtual file. The terminal summaries, academic view, file tree, Markdown list, and TeX list render ordinary anchors with those routes. Their click handlers may still open content inside the terminal, but the underlying `href` remains usable by crawlers, keyboard users, and no-JavaScript clients.

In production, `reader.html?path=...` is a `noindex,follow` compatibility shell. `js/reader.js` looks up the source path in `articles.json` and calls `window.location.replace()` with the canonical route. Development retains the legacy reader because canonical files do not exist until a build.

## Adding a publication

1. Add a `.md` file under `blog/posts/` with one H1, or a `.tex` file under `blog/papers/` with one `\title{}`.
2. Add a real author only when attribution is verified; do not add template or anonymous placeholders.
3. Use a fixed publication date when one exists. Do not use build time as publication time.
4. Run `node .github/scripts/generate-manifest.js`.
5. Run `npm test` to verify metadata and routes.
6. Run `npm run test:publication` to build and verify every generated artifact.

## Known rough edge

Native optional dependencies in `node_modules/` are platform-specific. A dependency directory copied from Linux to Windows cannot run Rollup or esbuild; run `npm ci` on the target platform. `node_modules/` and `dist/` are ignored and are not part of the durable change.

Changed-source summaries may temporarily retain their previous text with a mismatched content hash. The deployment workflow detects that state and regenerates summaries before building; canonical static descriptions do not depend on those summaries.

## Verification

Run `npm run test:publication` from the repository root to test metadata, perform the custom-domain production build, and validate canonical pages, descriptions, JSON-LD, single-H1 semantics, indexes, sitemap uniqueness, robots policy, homepage links, placeholder removal, `articles.json` mappings, TeX block/paragraph boundaries, bibliography-backed citation labels, TeX dash typography, and mode-toggle semantics.
