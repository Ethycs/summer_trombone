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
        this.worker = new Worker(new URL('./MarkdownWorker.js', import.meta.url), {
            type: 'module'
        });
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        const modules = import.meta.glob('/articles-md/*.md');
        this.articles = Object.keys(modules).map(path => path.split('/').pop());
        this.renderArticleList();
    }

    renderArticleList() {
        if (this.articles.length === 0) {
            this.articleListElement.innerHTML = '<div class="error-message">No .md files found.</div>';
            return;
        }

        this.articleListElement.innerHTML = this.articles.map(article =>
            `<div class="article-item" data-article="${article}">${article.replace('.md', '')}</div>`
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
            
            const response = await fetch(`./articles-md/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            
            const markdownContent = await response.text();
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
        if (manifest.includes('highlight')) {
            import('highlight.js').then(({ default: hljs }) => {
                this.articleContentElement.querySelectorAll('pre code.hljs').forEach(el => hljs.highlightElement(el));
            });
        }
        if (manifest.includes('mermaid')) {
            import('mermaid').then(({ default: mermaid }) => mermaid.run({
                nodes: this.articleContentElement.querySelectorAll('.language-mermaid')
            }));
        }
    }
}
