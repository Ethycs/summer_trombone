/* eslint-env worker */
// –––––  bring in the parser + plugins ––––––––––––––––––––
// (using unpkg so you can test without bundling;
//  for production, bundle these into a single file)
importScripts(
  'https://cdn.jsdelivr.net/npm/markdown-it@13/dist/markdown-it.min.js',
  'https://cdn.jsdelivr.net/npm/@vscode/markdown-it-katex@1.1.1/dist/index.min.js', 
  'https://cdn.jsdelivr.net/npm/markdown-it-footnote@3/dist/markdown-it-footnote.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2/dist/markdown-it-task-lists.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-deflist@2/dist/markdown-it-deflist.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-sub@2/dist/markdown-it-sub.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-sup@2/dist/markdown-it-sup.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-ins@2/dist/markdown-it-ins.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-mark@8/dist/markdown-it-mark.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-container@3/dist/markdown-it-container.min.js',
  'https://cdn.jsdelivr.net/npm/markdown-it-wikilinks@1/dist/markdown-it-wikilinks.min.js'
);

// –––––  build the same renderer Obsidian uses ––––––––––––
const md = markdownit({
  html:        false,   // Obsidian blocks raw HTML
  linkify:     true,
  typographer: true
})
  .use(window.markdownItKatex)
  .use(window.markdownitFootnote)
  .use(window.markdownItTaskLists, { label: true })
  .use(window.markdownitDeflist)
  .use(window.markdownitSub)
  .use(window.markdownitSup)
  .use(window.markdownitIns)
  .use(window.markdownitMark)
  // call-outs  > [!note] …
  .use(window.markdownitContainer, 'admonition')
  // [[wikilink|Alias]]
  .use(window.markdownitWikiLinks, {
      url (slug) { return `/note/${slug}`; },
      htmlAttrs: { class: 'internal-link' }
  });

// –––––  worker I/O — exactly like your TexParser worker –––––
self.onmessage = ({ data: markdown }) => {
  try {
    const html = md.render(markdown);
    self.postMessage({ ok: true,  html });
  } catch (err) {
    self.postMessage({ ok: false, error: err.message });
  }
};
