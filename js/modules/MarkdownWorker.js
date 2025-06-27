// ============== markdown-worker (runs in its own thread) ==============
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';
import tasklists from 'markdown-it-task-lists';
import deflist from 'markdown-it-deflist';
import container from 'markdown-it-container';
import attrs from 'markdown-it-attrs';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import katex from 'markdown-it-katex';
import emoji from 'markdown-it-emoji';
import wikilinks from 'markdown-it-wikilinks';
import hljsPlugin from 'markdown-it-highlightjs';
import mermaidPlugin from 'markdown-it-mermaid';

/* ------------------------------------------------------------------ */
/* 1. Build the parser                                                */
/* ------------------------------------------------------------------ */
const md = MarkdownIt({
  html: false, // security
  linkify: true,
  typographer: true,
  highlight: () => '' // highlight.js handled by plugin
})
  .use(hljsPlugin) // ```js …``` → <pre><code class="hljs …">
  .use(footnote)
  .use(anchor, { permalink: anchor.permalink.headerLink() })
  .use(toc, { level: [1, 2, 3] })
  .use(tasklists, { enabled: true })
  .use(deflist)
  .use(container, 'info') // :::info Foo bar:::
  .use(attrs) // {#id .class key=val}
  .use(sub)
  .use(sup)
  .use(katex, { throwOnError: false })
  .use(emoji)
  .use(wikilinks, { uriSuffix: '.html' }) // [[Page]] → <a href="Page.html">
  .use(mermaidPlugin); // ```mermaid fences

/* ------------------------------------------------------------------ */
/* 2. Obsidian call-out containers (“> [!note] …”)                    */
/* ------------------------------------------------------------------ */
const CALL_OUTS = ['note', 'tip', 'warning', 'danger', 'quote'];
CALL_OUTS.forEach(tag => {
  md.use(container, tag, {
    validate: params => params.trim().match(new RegExp(`^${tag}\\b`, 'i')),
    render: (tokens, idx) => {
      if (tokens[idx].nesting === 1) {
        return `<div class="callout ${tag}">\n`;
      }
      return '</div>\n';
    }
  });
});

/* ------------------------------------------------------------------ */
/* 3. Message loop                                                    */
/* ------------------------------------------------------------------ */
function scanManifest(html) {
  const out = new Set();
  if (html.includes('class="language-mermaid"') || html.includes('<div class="mermaid">'))
    out.add('mermaid');
  if (html.includes('class="katex"')) out.add('katex');
  if (html.includes('class="hljs')) out.add('highlight');
  return [...out];
}

self.onmessage = ({ data }) => {
  try {
    const html = md.render(data.markdown);
    const manifest = scanManifest(html);

    const resp = { id: data.id, html, manifest };
    self.postMessage(resp);
  } catch (err) {
    console.error('[MarkdownWorker] fatal:', err);
    self.postMessage({
      id: data.id,
      html: `<pre class="md-error">${err.message}</pre>`,
      manifest: []
    });
  }
};
