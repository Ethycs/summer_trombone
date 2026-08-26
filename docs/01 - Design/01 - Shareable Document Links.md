# Shareable Document Links

**Status:** CURRENT
**Date:** 2026-08-26
**Applies to:** Share links, focus mode, social preview cards
**Depends on:** [Static Publication Layer](<00 - Static Publication Layer.md>)

The static publication layer gave every document a canonical URL for search. It gave the terminal desktop nothing: opening an article into a window changed no URL state, so a reader who liked what they found in the terminal aesthetic could not link anyone to it. This design adds a second URL that presents one document as a fullscreen terminal window, and the social preview cards that make either URL worth pasting into a chat.

## 1. Three URLs, one document

| URL | Serves | Indexed | Carries `og:image` |
|---|---|---|---|
| `/articles/<slug>/` | canonical serif publication page | yes | yes |
| `/articles/<slug>/terminal/` | fullscreen terminal view — **the link the copy controls hand out** | no (`noindex,follow`, canonical → the page above) | yes |
| `/?doc=/articles/<slug>/` | the same view, as a compatibility alias | n/a | no |

Papers use `/papers/<slug>/` identically.

## 2. Constraints

1. **`canonicalPath` remains the single content identity.** Every share form is derived from it and normalises back to it. No second slug vocabulary is introduced.
2. **The canonical page never loses authority.** The terminal route is `noindex,follow` with a canonical pointing at the publication page, and is excluded from `sitemap.xml`.
3. **Social scrapers do not run JavaScript.** This is the load-bearing constraint. A preview appears only if the HTML *served at the shared URL* already contains `og:image`. On a static host a query string has no page of its own — `/?doc=<anything>` is served the one shared `index.html` — so `?doc=` can never carry per-document metadata. That is the entire reason `/articles/<slug>/terminal/` exists as a real file.
4. **No new rendering paths.** Both themes reuse the existing viewers; the cards reuse the existing build records.
5. **Fonts must exist on disk at build time.** The rasterizer cannot fetch the CDN faces the site uses at runtime.

## 3. Focus mode

One `.window` fills the viewport with its terminal title bar intact. Every other window and the taskbar are hidden; the theme toggle stays reachable. Close, un-maximize, and `Escape` all leave focus mode and restore the desktop, rewriting the URL to the site root so the address bar stays honest.

The document column is constrained to roughly 80 monospace columns. This is a fixed length rather than a `ch` value: `ch` resolves against each element's own font-size, which would give headings a far wider column than body text.

## 4. The academic equivalent

The alternative theme gets the same affordance rather than being sent to the terminal aesthetic. A share link carrying `mode=academic` opens an in-place document panel inside the academic overlay — the counterpart of the fullscreen window — instead of navigating away to the static page. Its copy control emits the `mode=academic` variant, so a reader in either theme hands out a link that lands the recipient where they were.

## 5. Preview cards

Every document gets a 1200×630 PNG drawn as a terminal window: title bar, `$ cat "<file>"` prompt, the title as payload, type label and date. The homepage and the collection indexes share a generic site card.

Cards are generated at build time from an SVG template. Two properties of the rasterizer shape that template: it performs no text layout, so lines are wrapped and positioned explicitly, and it does not support `<foreignObject>`, so there are no HTML-in-SVG shortcuts.

## 6. What this deliberately does not do

- **No per-post link affordance in the terminal feed.** Only the two document-bearing windows expose a copy control; the other five windows hold no document.
- **No indexed duplicate.** The terminal route exists to be shared, not found.
- **No window-state routing.** Which windows are open, and where they sit, remains outside the URL. Only the presented document is addressable.
