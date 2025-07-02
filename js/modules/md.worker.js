/* src/workers/md.worker.js ------------------------------------ */
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItTaskLists from 'markdown-it-task-lists';
import markdownItContainer from 'markdown-it-container';
import markdownItKatex from 'markdown-it-katex';

const md = new MarkdownIt({ linkify: true, typographer: true })
  .use(markdownItAnchor, { permalink: markdownItAnchor.permalink.headerLink() })
  .use(markdownItFootnote)
  .use(markdownItTaskLists, { enabled: true })
  .use(markdownItContainer, 'info')
  .use(markdownItKatex, {
    throwOnError: false,
    displayMode: true,
    fleqn: false,
    output: 'html',
    delimiters: [
      {left: "$$", right: "$$", display: true},
      {left: "$", right: "$", display: false},
      {left: "\\(", right: "\\)", display: false},
      {left: "\\[", right: "\\]", display: true}
    ]
  });

export function render(markdown) {
    let processedMarkdown = markdown.replace(/\$\$\s*([^\$]+)\s*\$\$/g, (match, math) => {
        if (match.includes('\n')) {
            return match;
        }
        return '\n$$\n' + math.trim() + '\n$$\n';
    });

    const html = md.render(processedMarkdown);
    const manifest = [];
    if (html.includes('class="katex"')) manifest.push('katex');
    if (html.includes('language-mermaid')) manifest.push('mermaid');

    return { html, manifest };
}

if (typeof self !== 'undefined') {
    self.onmessage = e => {
        const { id, markdown } = e.data;
        try {
            const { html, manifest } = render(markdown);
            self.postMessage({ id, html, manifest });
        } catch (err) {
            self.postMessage({ id, error: err.message, manifest: [] });
        }
    };
}
