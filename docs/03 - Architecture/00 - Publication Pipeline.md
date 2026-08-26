# Publication Pipeline

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** Build-time and runtime publication paths
**Depends on:** [Static Publication Layer](<../01 - Design/00 - Static Publication Layer.md>), [Static Publication Build](<../02 - Implementation/00 - Static Publication Build.md>)

Summer Trombone has one content inventory and two presentation surfaces. The static surface is canonical for publication and discovery; the interactive terminal consumes the same metadata and rendered content without defining a second URL system.

## Executive summary

`contentMetadata.js` is the shared contract for titles, descriptions, schemas, slugs, and routes. The manifest persists that contract, the build plugin turns it into static documents, and runtime UI components turn it into real anchors. Legacy query-string reader URLs exist only as compatibility inputs and redirect to the canonical surface in production.

## 1. Architecture

```text
                        ┌───────────────────────────┐
blog/posts/*.md ───────▶│                           │
                        │ contentMetadata.js        ├──── title / description
blog/papers/*.tex ─────▶│                           ├──── canonical path / schema
                        └─────────────┬─────────────┘
                                      │
                         generate-manifest.js
                                      │
                                      ▼
                         system/filesystem.json
                                      │
                 ┌────────────────────┴────────────────────┐
                 │                                         │
                 ▼                                         ▼
     vite-plugin-build-articles.js                   FileSystemSync
                 │                                         │
        existing renderers                                 │
                 │                                         │
     ┌───────────┼───────────┐                  ┌──────────┼──────────┐
     ▼           ▼           ▼                  ▼          ▼          ▼
canonical     indexes    discovery           terminal   academic   file tree
HTML pages               + articles.json     lists      view       + viewers
```

## 2. Content metadata

**Domain:** Pure source inspection and URL mapping
**Runs at:** Manifest generation, build time, and browser runtime
**Inputs:** Source path and optional source text
**Outputs:** Title, description, content type, schema type, canonical path, and verified optional attribution/date
**Internal structure:** Small extraction and normalization functions with no Node-only dependencies
**Hard constraints:** Deterministic output; no fabricated authors; route prefixes are `/articles/` or `/papers/`
**Target:** `js/modules/contentMetadata.js`

## 3. Manifest generation

**Domain:** Persistent content inventory
**Runs at:** GitHub Actions before summaries and build; manually during content work
**Inputs:** Git history, source files, and the previous manifest
**Outputs:** `system/filesystem.json`
**Internal structure:** Hash calculation, dates, publication metadata, and preserved summaries
**Hard constraints:** Existing creation dates remain stable; content changes update hashes; stale summaries remain visibly detectable by hash mismatch
**Target:** `.github/scripts/generate-manifest.js`

## 4. Static publication build

**Domain:** Canonical HTML and crawler discovery
**Runs at:** Vite `writeBundle`
**Inputs:** Manifest, source files, Markdown/TeX renderers, `css/publication.css`, Vite base path, and `CNAME`
**Outputs:** Canonical pages, collection indexes, homepage cards, `articles.json`, sitemap, and robots policy
**Internal structure:** Inventory → render → normalize H1 → page template → indexes/discovery → homepage injection
**Hard constraints:** One canonical route per source; one H1 per document; initial HTML contains the article; output paths stay under `dist/`
**Target:** `vite-plugin-build-articles.js`

## 5. Interactive consumers

**Domain:** Branded terminal and academic navigation
**Runs at:** Browser runtime
**Inputs:** `FileSystemSync` entries with canonical metadata
**Outputs:** Crawlable anchors plus terminal-native click behavior
**Internal structure:** `TerminalContentLoader`, `AcademicModeView`, `FileTreeWidget`, `MarkdownArticleSystem`, and `TexPaperSystem`
**Hard constraints:** Every content control has a meaningful `href`; runtime interception cannot change its canonical identity
**Target:** `js/modules/`

## 6. Share links and focus mode

**Domain:** Addressing one document in the interactive surface, and its social preview
**Runs at:** Vite `writeBundle` (carrier pages and cards); browser runtime (focus mode)
**Inputs:** `canonicalPath` from the manifest, the finished `dist/index.html`, and the Hack font on disk
**Outputs:** `/…/<slug>/terminal/` carrier pages, `dist/og/*.png` cards, and a fullscreen document view in both themes
**Internal structure:** `DocumentRoute.js` owns the URL contract (DOM-free, Node-testable); `FocusMode.js` owns the presentation; `og-card.js` draws the card; the build plugin writes the carriers by swapping the homepage's metadata block
**Hard constraints:** Carrier pages are `noindex,follow` and canonical to the publication page; they never enter `sitemap.xml`; `DocumentRoute.js` must not read `import.meta.env`; the terminal view never becomes a second indexed copy
**Target:** `js/modules/DocumentRoute.js`, `js/modules/FocusMode.js`, `og-card.js`, `vite-plugin-build-articles.js`

The terminal UI now carries URL state, which it previously did not. That state is deliberately narrow: the presented document only. Window positions and open/closed state stay out of the URL.

The carrier page exists because social scrapers do not execute JavaScript and a query string has no page of its own on a static host — see [Shareable Document Links](<../01 - Design/01 - Shareable Document Links.md>).

## 7. Compatibility reader

**Domain:** Old inbound `reader.html?path=...` URLs
**Runs at:** Browser runtime
**Inputs:** Source path and `articles.json`
**Outputs:** `location.replace()` to the canonical route, or the legacy renderer when mapping is unavailable
**Internal structure:** Production lookup before initializing the legacy article systems
**Hard constraints:** `noindex,follow`; no duplicate canonical document; development remains usable
**Target:** `reader.html`, `js/reader.js`

## Design axioms

1. Source content, not application state, defines a publication.
2. A URL is part of the content contract and is generated once; alternate presentations of a document are noindex and canonical to it.
3. Static HTML is the evidence layer; JavaScript is enhancement and compatibility.
4. The terminal aesthetic may be unconventional, but the document graph is conventional.
5. Metadata claims are omitted when the source cannot prove them.
6. Generated output is tested, not committed.

## Verification

Run `npm run test:publication`, inspect `dist/articles.json` for the source-to-canonical mapping, then compare one generated HTML document with its source to confirm the two presentation surfaces share rendered content.
