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
  .use(markdownItKatex, { throwOnError: false });

self.onmessage = e => {
  const { id, markdown } = e.data;
  try {
    const html = md.render(markdown);
    self.postMessage({ id, html });
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
};
