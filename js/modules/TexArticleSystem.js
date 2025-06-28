import { FileSystemSync } from './FileSystemSync.js';

/**
 * TeX Article System - Handles loading and rendering of LaTeX articles
 */
export class TexArticleSystem {
    constructor(containerElement, terminalEffects) {
        if (!containerElement) {
            throw new Error('TexArticleSystem requires a container element');
        }
        this.container = containerElement;
        this.articleListElement = this.container.querySelector('.article-list');
        this.articleContentElement = this.container.querySelector('.article-content');
        
        if (!this.articleListElement || !this.articleContentElement) {
            throw new Error('Container element must have .article-list and .article-content children.');
        }

        this.fs = new FileSystemSync();
        this.terminalEffects = terminalEffects;
        this.articles = [];
        this.currentArticle = null;
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
        const papers = this.fs.list('/blog/papers/');
        console.log('[TexArticleSystem] Refreshing article list, found:', papers.length, 'files in /blog/papers/');
        console.log('[TexArticleSystem] Papers:', papers);
        
        this.articles = papers.map(entry => {
            const filename = entry.path.split('/').pop();
            return {
                path: entry.path,
                filename,
                content: entry.content
            };
        });
        this.renderArticleList();
    }

    parseDirectoryListing(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a[href$=".tex"]');
        this.articles = Array.from(links).map(link => {
            const href = link.getAttribute('href');
            return href.split('/').pop();
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
                errorDiv.textContent = 'No .tex files found.';
                this.articleListElement.appendChild(errorDiv);
            }
            return;
        } else {
            const errorDiv = this.articleListElement.querySelector('.error-message');
            if (errorDiv) errorDiv.remove();
        }

        const articleHtml = this.articles.map(({ filename }) => {
            const isActive = filename === activeArticle ? 'active' : '';
            return `<div class="article-item ${isActive}" data-article="${filename}">${filename.replace('.tex', '')}</div>`;
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

        this.articleContentElement.addEventListener('click', (e) => {
            const target = e.target.closest('.citation');
            if (target) {
                e.preventDefault();
                const refId = target.getAttribute('href').substring(1);
                const refElement = this.articleContentElement.querySelector(`#${refId}`);
                if (refElement) {
                    const scrollContainer = this.container.querySelector('.window-content');
                    const headerHeight = this.container.querySelector('.window-header')?.offsetHeight || 0;

                    const containerRect = scrollContainer.getBoundingClientRect();
                    const targetRect = refElement.getBoundingClientRect();

                    const offset = targetRect.top - containerRect.top;
                    const scrollTop = scrollContainer.scrollTop + offset - headerHeight;

                    scrollContainer.scrollTo({
                        top: scrollTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    async loadArticle(filename) {
        this.currentArticle = filename;
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';

            const article = this.articles.find(a => a.filename === filename);
            if (!article) {
                throw new Error(`Article "${filename}" not found.`);
            }

            let texContent = article.content;
            if (texContent === null) {
                texContent = await this.fs.fetchFileContent(article.path);
            }

            const htmlContent = await this.parseTexInWorker(texContent);
            this.articleContentElement.innerHTML = htmlContent;
            
            this.renderMath();
            
        } catch (error) {
            this.articleContentElement.innerHTML = 
                `<div class="error-message">Error loading article: ${error.message}</div>`;
            this.currentArticle = null;
        }
    }

    parseTexInWorker(texContent) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./js/modules/TexParser.worker.js');

            worker.onmessage = (e) => {
                resolve(e.data);
                worker.terminate();
            };

            worker.onerror = (e) => {
                reject(new Error(`Worker error: ${e.message}`));
                worker.terminate();
            };

            worker.postMessage(texContent);
        });
    }

    async renderMath() {
        try {
            if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                renderMathInElement(this.articleContentElement, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true},
                        {left: '\\begin{equation}', right: '\\end{equation}', display: true},
                        {left: '\\begin{align}', right: '\\end{align}', display: true},
                        {left: '\\begin{gather}', right: '\\end{gather}', display: true},
                        {left: '\\begin{displaymath}', right: '\\end{displaymath}', display: true}
                    ],
                    throwOnError: false
                });
            } else {
                console.warn('KaTeX not available, waiting...');
                await this.waitForKaTeX();
                this.renderMath(); // Retry after waiting
            }
        } catch (error) {
            console.error('Error in renderMath:', error);
            this.showMathFallback();
        }
    }

    waitForKaTeX(timeout = 2000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('KaTeX loading timeout'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    showMathFallback() {
        const mathElements = this.articleContentElement.querySelectorAll('.article-equation');
        mathElements.forEach(element => {
            element.style.fontFamily = 'monospace';
            element.style.background = 'rgba(255, 255, 0, 0.1)';
            element.style.padding = '4px';
            element.style.border = '1px solid #ffff00';
            element.title = 'KaTeX not available - showing raw LaTeX';
        });
    }
}
