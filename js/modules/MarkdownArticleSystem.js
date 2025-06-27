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
        console.log('[MarkdownArticleSystem] Creating worker...');
        try {
            this.worker = new Worker(new URL('./md.worker.js', import.meta.url), { type: 'module' });
            console.log('[MarkdownArticleSystem] Full-featured worker created successfully');
        } catch (error) {
            console.error('[MarkdownArticleSystem] Failed to create worker:', error);
            throw error;
        }
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        console.log('[MarkdownArticleSystem] Loading article list...');
        const modules = import.meta.glob('../../articles-md/*.md', { as: 'raw' });
        console.log('[MarkdownArticleSystem] Glob modules:', modules);
        this.articles = await Promise.all(
            Object.entries(modules).map(async ([path, importer]) => {
                const filename = path.split('/').pop();
                console.log(`[MarkdownArticleSystem] Found article: ${filename}`);
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
            console.log('[MarkdownArticleSystem] Message received from worker:', data);
            const { id, html, manifest } = data;
            const handler = this.messageHandlers.get(id);
            if (handler) {
                handler({ html, manifest });
                this.messageHandlers.delete(id);
            } else {
                console.error(`[MarkdownArticleSystem] No handler found for message ID: ${id}`);
            }
        };
        
        this.worker.onerror = (error) => {
            console.error('[MarkdownArticleSystem] Worker error:', error);
        };
        
        this.worker.onmessageerror = (error) => {
            console.error('[MarkdownArticleSystem] Worker message error:', error);
        };
        
        this.messageHandlers = new Map();
    }

    async loadArticle(filename) {
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';
            console.log(`[MarkdownArticleSystem] Loading article: ${filename}`);
            
            const article = this.articles.find(a => a.filename === filename);
            if (!article) {
                throw new Error(`Article "${filename}" not found.`);
            }

            console.log('[MarkdownArticleSystem] Importing content...');
            const markdownContent = await article.importer();
            console.log('[MarkdownArticleSystem] Content imported, rendering...');
            const { html, manifest } = await this.renderMarkdown(markdownContent);
            
            this.articleContentElement.innerHTML = html;
            
            console.log('[MarkdownArticleSystem] Post-processing...');
            this.postProcess(manifest);
            console.log('[MarkdownArticleSystem] Article loaded successfully.');

        } catch (error) {
            console.error(`[MarkdownArticleSystem] Error loading article: ${error.message}`, error);
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
