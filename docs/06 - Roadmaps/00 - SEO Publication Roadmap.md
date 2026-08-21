# SEO Publication Roadmap

**Status:** Living Document — 2026-08-20
**Date:** 2026-08-20
**Applies to:** Static discovery and publication of the existing blog corpus
**Depends on:** [Static publication design](<../01 - Design/00 - Static Publication Layer.md>)

## Initial diagnosis and implementation verdict

| Area | Diagnostic baseline | Potential target | Delivered engineering state |
| --- | ---: | ---: | --- |
| Content quality | 75/100 | 85/100 | Existing prose preserved; heading and attribution placeholders corrected |
| Technical SEO | 20/100 | 90/100 | ✅ Per-document metadata, canonical URLs, JSON-LD, sitemap, and robots |
| Crawlability | 15/100 | 95/100 | ✅ Initial article HTML, collection indexes, and ordinary anchors |
| On-page semantics | 30/100 | 90/100 | ✅ One H1 per publication and hierarchical TeX sections |
| Internal linking | 15/100 | 85/100 | ✅ Canonical anchors across homepage and runtime UI |
| Brand/topic clarity | 40/100 | 80/100 | ✅ Initial homepage HTML describes and links the actual corpus |

These scores are diagnostic estimates, not measured search-performance results. The engineering target is the acceptance criteria below, not a guaranteed ranking score.

## Tier 0 — Static publication foundation

| Gap | Depends on | Blocks | Status |
| --- | --- | --- | --- |
| Generate permanent post and paper HTML pages | Existing Markdown/TeX renderers | All page-level SEO | ✅ Complete |
| Generate deterministic slugs and canonical URLs | Content title extraction | Links, sitemap, redirects | ✅ Complete |
| Emit title, description, canonical, social metadata, and JSON-LD | Static page template | Search and sharing semantics | ✅ Complete |
| Generate `/articles/` and `/papers/` indexes | Canonical URL mapping | Crawlable discovery | ✅ Complete |
| Generate `sitemap.xml` and `robots.txt` | Canonical URL mapping | Crawler discovery | ✅ Complete |

## Tier 1 — Crawlable navigation and truthful homepage

| Gap | Depends on | Blocks | Status |
| --- | --- | --- | --- |
| Replace `href="#"` article controls with canonical hrefs | Shared URL mapping | Link graph | ✅ Complete |
| Replace clickable article-card `<div>` elements with anchors | Shared URL mapping | Link graph | ✅ Complete |
| Replace static fictional homepage posts with real publications | Canonical page generation | Topic clarity | ✅ Complete |
| Add homepage description, canonical, social metadata, and WebSite JSON-LD | Stable site identity | Homepage semantics | ✅ Complete |

## Tier 2 — Trust and compatibility

| Gap | Depends on | Blocks | Status |
| --- | --- | --- | --- |
| Remove placeholder authorship from `Green Teaming` | Content edit | Trust signals | ✅ Complete |
| Remove placeholder authorship from the TeX paper | Content edit | Trust signals | ✅ Complete |
| Preserve legacy reader URLs and route known paths to canonicals | Generated mapping | Backward compatibility | ✅ Complete |
| Add an author/about page | Verified author identity and copy | Stronger entity signals | Deferred: identity input required |

## Acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| Production build completes | ✅ | Vite built 1,751 modules and the publication plugin completed |
| One canonical page per source | ✅ | Three sources mapped to three tested document routes |
| Meaningful metadata, initial HTML, and valid JSON-LD | ✅ | `test_publication.mjs --dist` parses and asserts each output |
| Collection indexes link every document | ✅ | Generated `/articles/` and `/papers/` indexes |
| Sitemap contains each canonical once | ✅ | Six unique `<loc>` entries asserted |
| Robots allows crawling and names sitemap | ✅ | Generated `dist/robots.txt` asserted |
| Homepage and runtime UI expose real hrefs | ✅ | Static homepage assertions plus bundled anchor renderers |
| No template author placeholders | ✅ | Source scan and metadata tests |
| Known reader paths route to canonicals | ✅ | Production lookup and `location.replace()` implementation |
| Documentation reflects the result | ✅ | Design, Implementation, Architecture, Roadmap, and Handoff reconciled |

## Open work, in priority order

1. Add the deferred author/about page after verified identity and attribution copy are available.
2. Submit the deployed sitemap to search consoles and measure indexing; diagnostic score targets are not ranking guarantees.
3. Keep `npm run test:publication` and production-route checks as release gates for future content changes.

## Verification

Run `npm run test:publication`, then compare its generated routes with the acceptance table before changing any completed row.
