/**
 * TeX Article System - Handles loading and rendering of LaTeX articles
 */
export class TexArticleSystem {
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error('TexArticleSystem requires a container element');
        }
        this.container = containerElement;
        this.articleListElement = this.container.querySelector('.article-list');
        this.articleContentElement = this.container.querySelector('.article-content');
        
        if (!this.articleListElement || !this.articleContentElement) {
            throw new Error('Container element must have .article-list and .article-content children.');
        }

        this.articles = [];
        this.currentArticle = null;
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        console.log('[TexArticleSystem] Loading article list...');
        const modules = import.meta.glob('../../article/*.tex', { query: '?raw', import: 'default' });
        console.log('[TexArticleSystem] Glob modules:', modules);
        this.articles = await Promise.all(
            Object.entries(modules).map(async ([path, importer]) => {
                const filename = path.split('/').pop();
                console.log(`[TexArticleSystem] Found article: ${filename}`);
                return { filename, importer };
            })
        );
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
        if (this.articles.length === 0) {
            this.articleListElement.innerHTML = '<div class="error-message">No .tex files found in articles directory</div>';
            return;
        }

        this.articleListElement.innerHTML = this.articles.map(({ filename }) =>
            `<div class="article-item" data-article="${filename}">${filename.replace('.tex', '')}</div>`
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
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';
            console.log(`[TexArticleSystem] Loading article: ${filename}`);

            const article = this.articles.find(a => a.filename === filename);
            if (!article) {
                throw new Error(`Article "${filename}" not found.`);
            }

            console.log('[TexArticleSystem] Importing content...');
            const texContent = await article.importer();
            console.log('[TexArticleSystem] Content imported, parsing...');
            const htmlContent = await this.parseTexInWorker(texContent);
            this.articleContentElement.innerHTML = htmlContent;
            
            console.log('[TexArticleSystem] Rendering math...');
            this.renderMath();
            console.log('[TexArticleSystem] Article loaded successfully.');
            
        } catch (error) {
            console.error(`[TexArticleSystem] Error loading article: ${error.message}`, error);
            this.articleContentElement.innerHTML = 
                `<div class="error-message">Error loading article: ${error.message}</div>`;
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
