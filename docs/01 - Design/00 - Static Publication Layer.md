# Static Publication Layer

**Status:** CURRENT
**Date:** 2026-08-20
**Applies to:** Public Markdown posts, TeX papers, homepage discovery, and legacy reader URLs
**Depends on:** [Agentic Technique Master](<../Agentic Technique Master.md>), [SEO publication roadmap](<../06 - Roadmaps/00 - SEO Publication Roadmap.md>)

Summer Trombone will preserve its interactive terminal interface while adding a conventional static document graph underneath it. The static layer is the canonical publication surface; the terminal remains a branded discovery and reading experience.

## Non-negotiable constraints

1. Public content MUST be available in the initial HTML response without client-side rendering.
2. Every public document MUST have one stable, human-readable canonical URL.
3. Every rendered article and paper MUST be reachable through ordinary `<a href>` links.
4. The existing terminal experience MUST remain functional.
5. Markdown and TeX MUST continue to use the repository's existing renderers so interactive and static output cannot drift by design.
6. Metadata MUST be derived from content or explicit source metadata; the build MUST NOT invent authorship.
7. Legacy `reader.html?path=...` URLs MUST remain usable and point search engines toward the canonical page.

## Problem statement

The current build renders Markdown and TeX into `articles.json`, then the browser injects that HTML into a generic `reader.html` shell. Distinct documents therefore begin with the same title and loading content, and much of the browsing interface exists as click handlers or `href="#"` rather than as a crawlable hyperlink graph.

The static homepage also emphasizes fictional placeholder posts instead of the repository's real writing. This makes the strongest server-delivered description of the site disagree with its published corpus.

## Intended architecture

```text
blog/posts/*.md ─┐
                 ├─ existing renderer ─┬─ articles.json ─ interactive terminal
blog/papers/*.tex┘                     │
                                      ├─ /articles/<slug>/index.html
                                      ├─ /papers/<slug>/index.html
                                      ├─ /articles/index.html
                                      ├─ /papers/index.html
                                      └─ sitemap.xml + robots.txt
```

The build owns slug creation, canonical URL creation, metadata extraction, static page templates, content indexes, and discovery files. Runtime modules consume the same canonical URL mapping when they render links.

## URL model

| Source | Canonical route | Schema type |
| --- | --- | --- |
| `blog/posts/<name>.md` | `/articles/<title-slug>/` | `Article` |
| `blog/papers/<name>.tex` | `/papers/<title-slug>/` | `ScholarlyArticle` |

Slugs are lowercase ASCII, collapse punctuation and whitespace to one hyphen, and trim leading or trailing hyphens. A source path remains the compatibility key in `articles.json`; the canonical route becomes the public identity.

## Static document contract

Each generated document contains:

- A content-specific `<title>` and meta description.
- A canonical link using `https://summertrombone.com`.
- Open Graph and Twitter metadata.
- `Article` or `ScholarlyArticle` JSON-LD without fabricated authorship.
- One visible article `<h1>` and the rendered body in the initial HTML.
- Crawlable links back to the homepage and the appropriate content index.
- The existing academic visual language and shared CSS.

The static `/articles/` and `/papers/` indexes list every corresponding document with ordinary anchors. The homepage links to real current publications with ordinary anchors as well.

## Metadata policy

| Field | Preferred source | Fallback |
| --- | --- | --- |
| Title | Markdown H1 or TeX title | Humanized filename |
| Description | Explicit description when supported | First meaningful plain-text paragraph, length-limited |
| Author | Explicit non-placeholder source value | Omit |
| Date | Explicit publication date | Omit |
| Canonical | Deterministic type and title slug | None; build failure if unavailable |
| Image | Explicit project asset | Omit until a suitable asset exists |

Placeholder values such as `Anonymous Author(s)` or template instructions are treated as absent, not published as identity claims.

## Compatibility behavior

`reader.html` remains available for inbound legacy URLs. When its requested source path exists in the generated manifest, client code replaces the browser history entry with the canonical URL before navigating there. If no mapping exists, the current reader error behavior remains available for diagnosis.

## Verification

Run `npm run build`, inspect `dist/articles/`, `dist/papers/`, `dist/sitemap.xml`, and `dist/robots.txt`, then decide whether the generated HTML satisfies the contract above without executing JavaScript.
