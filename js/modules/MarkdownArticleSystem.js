import { FileSystemSync } from './FileSystemSync.js';

/**
 * Markdown Article System - Handles loading and rendering of Markdown articles
 */
export class MarkdownArticleSystem {
    constructor(containerElement, terminalEffects, fileSystemSync) {
        if (!containerElement) {
            throw new Error('MarkdownArticleSystem requires a container element');
        }
        this.container = containerElement;
        this.articleListElement = this.container.querySelector('.article-list');
        this.articleContentElement = this.container.querySelector('.article-content');
        
        if (!this.articleListElement || !this.articleContentElement) {
            throw new Error('Container element must have .article-list and .article-content children.');
        }

        this.fs = fileSystemSync;
        this.terminalEffects = terminalEffects;
        this.articles = [];
        this.currentArticle = null;
        this.worker = new Worker(new URL('./md.worker.js', import.meta.url), { type: 'module' });
    }

    async init() {
        this.setupEventListeners();
        this.fs.watch((event, data) => this.handleFilesystemChange(event, data));
        // Initial load is handled by the watcher via 'scan-complete'
    }

    handleFilesystemChange(event, data) {
        const notifications = {
            'file-added': (path) => `[NEW] File created: ${path}`,
            'file-removed': (path) => `[DEL] File removed: ${path}`,
            'file-change': (path) => `[MOD] File updated: ${path}`
        };

        if (notifications[event]) {
            this.showNotification(notifications[event](data));
            if (this.terminalEffects) {
                this.terminalEffects.trigger(event);
            }
        }

        if (event === 'scan-complete' || event.startsWith('file-')) {
            this.refreshArticleList();
        }
    }

    showNotification(message) {
        const notifElement = document.createElement('div');
        notifElement.className = 'system-message';
        notifElement.textContent = message;
        this.articleListElement.prepend(notifElement);
        setTimeout(() => notifElement.remove(), 5000);
    }

    refreshArticleList() {
        const posts = this.fs.list('/blog/posts/');
        console.log('[MarkdownArticleSystem] Refreshing article list, found:', posts.length, 'files in /blog/posts/');
        console.log('[MarkdownArticleSystem] Posts:', posts);
        
        this.articles = posts.map(entry => {
            const filename = entry.path.split('/').pop();
            return {
                path: entry.path,
                filename,
                content: entry.content.content,
                created: entry.content.created,
                modified: entry.content.modified
            };
        });
        this.renderArticleList();
    }

    renderArticleList() {
        const activeArticle = this.currentArticle;
        
        // Remove both article items and loading indicator
        const items = this.articleListElement.querySelectorAll('.article-item, .loading-indicator');
        items.forEach(item => item.remove());

        if (this.articles.length === 0) {
            if (!this.articleListElement.querySelector('.error-message')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'No .md files found.';
                this.articleListElement.appendChild(errorDiv);
            }
            return;
        } else {
            const errorDiv = this.articleListElement.querySelector('.error-message');
            if (errorDiv) errorDiv.remove();
        }

        const articleHtml = this.articles.map(({ filename }) => {
            const isActive = filename === activeArticle ? 'active' : '';
            return `<div class="article-item ${isActive}" data-article="${filename}">${filename.replace('.md', '')}</div>`;
        }).join('');
        
        this.articleListElement.insertAdjacentHTML('beforeend', articleHtml);
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

        this.messageHandlers = new Map();
        
        this.worker.onmessage = ({ data }) => {
            const { id, html, manifest } = data;
            const handler = this.messageHandlers.get(id);
            if (handler) {
                handler({ html, manifest });
                this.messageHandlers.delete(id);
            }
        };
    }

    async loadArticle(filename) {
        this.currentArticle = filename;
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';

            if (import.meta.env.PROD) {
                const basePath = import.meta.env.BASE_URL;
                const response = await fetch(`${basePath}articles.json`);
                const articles = await response.json();
                const articlePath = `/blog/posts/${filename}`;
                const articleData = articles[articlePath];

                if (articleData && articleData.html) {
                    this.articleContentElement.innerHTML = articleData.html;
                } else {
                    throw new Error(`Article "${filename}" not found in pre-built data.`);
                }
            } else {
                console.log('[MarkdownArticleSystem] Looking for article:', filename);
                console.log('[MarkdownArticleSystem] Available articles:', this.articles.map(a => a.filename));

                if (this.articles.length === 0) {
                    console.log('[MarkdownArticleSystem] Articles array is empty, refreshing...');
                    this.refreshArticleList();
                }

                let article = this.articles.find(a => a.filename === filename);
                if (!article) {
                    console.log('[MarkdownArticleSystem] Article not in cache, trying direct load...');
                    const posts = this.fs.list('/blog/posts/');
                    const directArticle = posts.find(entry => entry.path.split('/').pop() === filename);

                    if (directArticle) {
                        article = {
                            path: directArticle.path,
                            filename: filename,
                            content: directArticle.content.content
                        };
                    } else {
                        throw new Error(`Article "${filename}" not found.`);
                    }
                }

                let markdownContent = article.content;
                if (markdownContent === null) {
                    markdownContent = await this.fs.fetchFileContent(article.path);
                }

                const { html, manifest } = await this.renderMarkdown(markdownContent);
                this.articleContentElement.innerHTML = html;
                this.postProcess(manifest);
            }
        } catch (error) {
            this.articleContentElement.innerHTML =
                `<div class="error-message">Error loading article: ${error.message}</div>`;
            this.currentArticle = null;
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
        // Handle KaTeX rendering if needed
        if (manifest && manifest.includes('katex')) {
            // markdown-it-katex already converted math to KaTeX HTML
            // The KaTeX CSS should handle the display
            // But let's log to verify
            const katexElements = this.articleContentElement.querySelectorAll('.katex');
            console.log(`[MarkdownArticleSystem] Found ${katexElements.length} KaTeX elements`);
        }
        
        // Find all mermaid code blocks and render them
        if (manifest && manifest.includes('mermaid')) {
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
}
