import { TexParser } from './TexParser.js';

/**
 * TeX Article System - Handles loading and rendering of LaTeX articles
 */
export class TexArticleSystem {
    constructor() {
        this.articles = [];
        this.currentArticle = null;
        this.articleListElement = document.getElementById('articleList');
        this.articleContentElement = document.getElementById('articleContent');
        this.parser = new TexParser();
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        try {
            const response = await fetch('./article/');
            if (response.ok) {
                const html = await response.text();
                this.parseDirectoryListing(html);
            } else {
                this.articles = ['premium_for_that.tex'];
                this.renderArticleList();
            }
        } catch (error) {
            console.log('Directory listing not available, using known articles');
            this.articles = ['premium_for_that.tex'];
            this.renderArticleList();
        }
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

        this.articleListElement.innerHTML = this.articles.map(article => 
            `<div class="article-item" data-article="${article}">${article.replace('.tex', '')}</div>`
        ).join('');
    }

    setupEventListeners() {
        this.articleListElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('article-item')) {
                this.loadArticle(e.target.dataset.article);
                
                document.querySelectorAll('.article-item').forEach(item => 
                    item.classList.remove('active'));
                e.target.classList.add('active');
            }
        });
    }

    async loadArticle(filename) {
        try {
            this.articleContentElement.innerHTML = '<div class="loading-indicator">Loading article...</div>';
            
            const response = await fetch(`./article/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            
            const texContent = await response.text();
            const htmlContent = this.parseTexToHtml(texContent);
            this.articleContentElement.innerHTML = htmlContent;
            
            this.renderMath();
            
        } catch (error) {
            this.articleContentElement.innerHTML = 
                `<div class="error-message">Error loading article: ${error.message}</div>`;
        }
    }

    parseTexToHtml(texContent) {
        const titleMatch = texContent.match(/\\title\{([^}]+)\}/);
        const authorMatch = texContent.match(/\\author\{([^}]+)\}/);
        const abstractMatch = texContent.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
        const documentMatch = texContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
        
        if (!documentMatch) {
            return '<div class="error-message">Invalid TeX document structure</div>';
        }

        let html = '';
        if (titleMatch) {
            const fullTitle = titleMatch[1];
            const titleParts = fullTitle.split('\\\\');
            html += `<div class="article-title">${this.parser.processTexText(titleParts[0])}</div>`;
            if (titleParts[1]) {
                html += `<div class="article-subtitle">${this.parser.processTexText(titleParts[1])}</div>`;
            }
        }
        
        if (authorMatch) {
            html += `<div class="article-author">${this.parser.processTexText(authorMatch[1])}</div>`;
        }
        
        if (abstractMatch) {
            html += `<div class="article-abstract">
                <strong>Abstract:</strong><br>
                ${this.parser.processTexText(abstractMatch[1])}
            </div>`;
        }
        
        let content = documentMatch[1];
        content = content.replace(/\\maketitle\s*/g, '');
        content = content.replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '');

        html += this.parser.parse(content);
        
        return html;
    }

    async renderMath() {
        try {
            if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                renderMathInElement(this.articleContentElement, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
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