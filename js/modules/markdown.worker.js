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
import hljs from 'markdown-it-highlightjs';

// Initialize markdown-it with plugins
const md = MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
})
  .use(hljs)
  .use(footnote)
  .use(anchor, { permalink: anchor.permalink.headerLink() })
  .use(toc, { level: [1, 2, 3] })
  .use(tasklists, { enabled: true })
  .use(deflist)
  .use(container, 'info')
  .use(attrs)
  .use(sub)
  .use(sup)
  .use(katex, { throwOnError: false })
  .use(emoji)
  .use(wikilinks, { uriSuffix: '.html' });

// Add Obsidian-style callouts
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

// Log worker initialization
console.log('[markdown.worker] Worker initialized');

// Message handler
self.onmessage = ({ data }) => {
  console.log('[markdown.worker] Message received:', data);
  
  try {
    const { id, markdown } = data;
    console.log(`[markdown.worker] Processing markdown for ID: ${id}, length: ${markdown?.length || 0} chars`);
    
    const html = md.render(markdown);
    console.log(`[markdown.worker] Markdown rendered successfully, HTML length: ${html.length} chars`);
    
    // Scan for features that need post-processing
    const manifest = [];
    if (html.includes('class="katex"')) manifest.push('katex');
    if (html.includes('class="hljs')) manifest.push('highlight');
    if (html.includes('class="language-mermaid"') || html.includes('<div class="mermaid">')) {
      manifest.push('mermaid');
    }
    
    console.log(`[markdown.worker] Manifest:`, manifest);
    console.log(`[markdown.worker] Sending response for ID: ${id}`);
    
    self.postMessage({ id, html, manifest });
  } catch (err) {
    console.error('[markdown.worker] Error:', err);
    self.postMessage({ 
      id: data.id, 
      html: `<div class="error-message">Error rendering markdown: ${err.message}</div>`,
      manifest: []
    });
  }
};