/**
 * Markdown Article System - Handles loading and rendering of Markdown articles
 */
export class MarkdownArticleSystem {
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error('MarkdownArticleSystem requires a container element');
        }
        this.container = containerElement;
        this.articleListElement = this.container.querySelector('.article-list');
        this.articleContentElement = this.container.querySelector('.article-content');
        
        if (!this.articleListElement || !this.articleContentElement) {
            throw new Error('Container element must have .article-list and .article-content children.');
        }

        this.articles = [];
        this.currentArticle = null;
        this.worker = new Worker(new URL('./md.worker.js', import.meta.url), { type: 'module' });
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        const modules = import.meta.glob('../../articles-md/*.md', { as: 'raw' });
        this.articles = await Promise.all(
            Object.entries(modules).map(async ([path, importer]) => {
                const filename = path.split('/').pop();
                return { filename, importer };
            })
        );
        this.renderArticleList();
    }

    renderArticleList() {
        if (this.articles.length === 0) {
            this.articleListElement.innerHTML = '<div class="error-message">No .md files found.</div>';
            return;
        }

        this.articleListElement.innerHTML = this.articles.map(({ filename }) =>
            `<div class="article-item" data-article="${filename}">${filename.replace('.md', '')}</div>`
        ).join('');
    }

    setupEventListeners() {
        this.articleListElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('article-item')) {
                this.loadArticle(e.target.dataset.article);
                
                this.articleListElement.querySelectorAll('.article-item').forEach(item =>
                    item.classList.remove('active'));
                e.target.classList.add('active');
            }
        });

        this.worker.onmessage = ({ data }) => {
            const { id, html, manifest } = data;
            const handler = this.messageHandlers.get(id);
            if (handler) {
                handler({ html, manifest });
                this.messageHandlers.delete(id);
            }
        };
        this.messageHandlers = new Map();
    }

    async loadArticle(filename) {
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';
            
            const article = this.articles.find(a => a.filename === filename);
            if (!article) {
                throw new Error(`Article "${filename}" not found.`);
            }

            const markdownContent = await article.importer();
            const { html, manifest } = await this.renderMarkdown(markdownContent);
            
            this.articleContentElement.innerHTML = html;
            
            this.postProcess(manifest);

        } catch (error) {
            this.articleContentElement.innerHTML = 
                `<div class="error-message">Error loading article: ${error.message}</div>`;
        }
    }

    renderMarkdown(markdown) {
        return new Promise(resolve => {
            const id = crypto.randomUUID();
            this.messageHandlers.set(id, resolve);
            this.worker.postMessage({ id, markdown });
        });
    }

    postProcess(manifest) {
        // Find all mermaid code blocks and render them
        this.articleContentElement.querySelectorAll('code.language-mermaid').forEach((el) => {
            import('mermaid').then(({ default: mermaid }) => {
                const code = el.textContent;
                const container = document.createElement('div');
                container.className = 'mermaid';
                container.textContent = code;
                el.parentNode.replaceWith(container);
                mermaid.run({ nodes: [container] });
            });
        });
    }
}
