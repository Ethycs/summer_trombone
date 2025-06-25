/**
 * TeX Article System - Handles loading and rendering of LaTeX articles
 */
export class TexArticleSystem {
    constructor() {
        this.articles = [];
        this.currentArticle = null;
        this.articleListElement = document.getElementById('articleList');
        this.articleContentElement = document.getElementById('articleContent');
    }

    async init() {
        await this.loadArticleList();
        this.setupEventListeners();
    }

    async loadArticleList() {
        try {
            // Try to load articles from the articles directory
            const response = await fetch('./article/');
            if (response.ok) {
                const html = await response.text();
                this.parseDirectoryListing(html);
            } else {
                // Fallback: try known articles
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
            // Remove any leading path components, we just want the filename
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
                
                // Update active state
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
            
            // Render math with KaTeX
            this.renderMath();
            
        } catch (error) {
            this.articleContentElement.innerHTML = 
                `<div class="error-message">Error loading article: ${error.message}</div>`;
        }
    }

    parseTexToHtml(texContent) {
        let html = '';
        
        // Extract document metadata
        const titleMatch = texContent.match(/\\title\{([^}]+)\}/);
        const authorMatch = texContent.match(/\\author\{([^}]+)\}/);
        const dateMatch = texContent.match(/\\date\{([^}]+)\}/);
        
        // Extract abstract
        const abstractMatch = texContent.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
        
        // Extract main document content
        const documentMatch = texContent.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
        
        if (!documentMatch) {
            return '<div class="error-message">Invalid TeX document structure</div>';
        }
        
        let content = documentMatch[1];
        
        // Remove duplicate abstract from content if it exists
        content = content.replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '');
        
        // Add title section
        if (titleMatch) {
            const fullTitle = titleMatch[1];
            const titleParts = fullTitle.split('\\\\');
            html += `<div class="article-title">${this.processTexText(titleParts[0])}</div>`;
            if (titleParts[1]) {
                html += `<div class="article-subtitle">${this.processTexText(titleParts[1])}</div>`;
            }
        }
        
        if (authorMatch) {
            html += `<div class="article-author">${this.processTexText(authorMatch[1])}</div>`;
        }
        
        // Add abstract (only once)
        if (abstractMatch) {
            html += `<div class="article-abstract">
                <strong>Abstract:</strong><br>
                ${this.processTexText(abstractMatch[1])}
            </div>`;
        }
        
        // Process main content
        html += this.processTexContent(content);
        
        return html;
    }

    processTexContent(content) {
        let html = '';
        
        // Remove maketitle and other commands
        content = content.replace(/\\maketitle\s*/g, '');
        
        // Split into sections
        const sections = content.split(/(?=\\section)/);
        
        for (let section of sections) {
            if (section.trim()) {
                html += this.processSection(section);
            }
        }
        
        return html;
    }

    processSection(section) {
        let html = '<div class="article-section">';
        
        // Process section headers first
        section = section.replace(/\\section\{([^}]+)\}/g, '<h1>$1</h1>');
        section = section.replace(/\\subsection\{([^}]+)\}/g, '<h2>$1</h2>');
        section = section.replace(/\\subsubsection\{([^}]+)\}/g, '<h3>$1</h3>');
        
        // FIRST: Process display math and equation environments BEFORE theorem environments
        // This prevents math inside definitions/theorems from being corrupted
        
        // Process equation environments - fix align environment
        section = section.replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, 
            (match, content) => {
                // Clean up HTML entities in align content
                const cleanContent = content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                return `<div class="article-equation">$$\\begin{align}${cleanContent}\\end{align}$$</div>`;
            });
        section = section.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, 
            '<div class="article-equation">$$\\begin{equation}$1\\end{equation}$$</div>');
        
        // NOW process theorems, definitions, etc. with math preservation FIRST
        section = section.replace(/\\begin\{theorem\}([\s\S]*?)\\end\{theorem\}/g, 
            (match, content) => this.processTheoremEnvironment('Theorem', content));
        section = section.replace(/\\begin\{definition\}([\s\S]*?)\\end\{definition\}/g, 
            (match, content) => this.processTheoremEnvironment('Definition', content));
        section = section.replace(/\\begin\{lemma\}([\s\S]*?)\\end\{lemma\}/g, 
            (match, content) => this.processTheoremEnvironment('Lemma', content));
        section = section.replace(/\\begin\{corollary\}([\s\S]*?)\\end\{corollary\}/g, 
            (match, content) => this.processTheoremEnvironment('Corollary', content));

        // THEN process remaining display math - but don't double-process if already processed
        section = section.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
            // Only wrap if not already wrapped
            if (content.includes('<div class="article-equation">')) {
                return match;
            }
            // Clean HTML entities in display math too
            const cleanContent = content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            return `<div class="article-equation">$$${cleanContent}$$</div>`;
        });
        
        // Process proofs with math preservation
        section = section.replace(/\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, 
            (match, content) => this.processTheoremEnvironment('Proof', content).replace('article-theorem', 'article-proof'));
        
        // Process tables
        section = section.replace(/\\begin\{table\}[\s\S]*?\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}[\s\S]*?\\end\{table\}/g, 
            (match, tableContent) => this.processTable(tableContent));
        
        // Process lists
        section = section.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, 
            (match, listContent) => '<ol>' + listContent.replace(/\\item\s*/g, '<li>') + '</ol>');
        section = section.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, 
            (match, listContent) => '<ul>' + listContent.replace(/\\item\s*/g, '<li>') + '</ul>');
        
        // Process bibliography
        section = section.replace(/\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g, 
            '<div class="article-bibliography"><h2>References</h2>$1</div>');
        section = section.replace(/\\bibitem\[([^\]]*)\]\{([^}]*)\}/g, '<div class="article-bibitem">[$1] ');
        section = section.replace(/\\bibitem\{([^}]*)\}/g, '<div class="article-bibitem">');
        
        // Process citations
        section = section.replace(/\\citep?\{([^}]+)\}/g, '[$1]');
        
        // Process text formatting with math preservation
        section = this.processTexTextWithEquations(section);
        
        // Split into paragraphs
        const paragraphs = section.split(/\n\s*\n/);
        for (let para of paragraphs) {
            para = para.trim();
            if (para && !para.startsWith('<')) {
                html += `<p>${para}</p>`;
            } else if (para) {
                html += para;
            }
        }
        
        html += '</div>';
        return html;
    }
    
    processTexTextSimple(text) {
        // Simple text processing without math preservation (math already handled)
        
        // Process LaTeX line breaks
        text = text.replace(/\\\\/g, '<br>');
        
        // Process basic text formatting
        text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
        
        // Process citations
        text = text.replace(/\\citep?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');
        
        // Clean up remaining LaTeX commands
        text = text.replace(/\\[a-zA-Z]+\*?\s*/g, ' ');
        text = text.replace(/\{([^}]*)\}/g, '$1');
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ');
        
        return text.trim();
    }

    processTheoremEnvironment(title, content) {
        // Store for math expressions to preserve them during text processing
        const mathStore = [];
        let mathCounter = 0;
        
        // Extract and preserve ALL math expressions before text processing
        // Display math: $$...$$
        content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
            const placeholder = `THEOREM_MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${mathContent}$$`;
            return placeholder;
        });
        
        // Inline math: $...$ (but not currency)
        content = content.replace(/\$([^$\d\s][^$]*?)\$/g, (match, mathContent) => {
            const placeholder = `THEOREM_MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${mathContent}\\)`;
            return placeholder;
        });
        
        // LaTeX inline math: \(...\)
        content = content.replace(/\\\(([^)]+)\\\)/g, (match, mathContent) => {
            const placeholder = `THEOREM_MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${mathContent}\\)`;
            return placeholder;
        });
        
        // LaTeX display math: \[...\]
        content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
            const placeholder = `THEOREM_MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${mathContent}$$`;
            return placeholder;
        });
        
        // Now process the text with math safely stored
        // Process LaTeX line breaks
        content = content.replace(/\\\\/g, '<br>');
        
        // Process basic text formatting
        content = content.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        content = content.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        content = content.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
        content = content.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
        
        // Process citations
        content = content.replace(/\\citep?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');
        
        // Clean up HTML entities
        content = content.replace(/&amp;/g, '&');
        content = content.replace(/&lt;/g, '<');
        content = content.replace(/&gt;/g, '>');
        content = content.replace(/&quot;/g, '"');
        content = content.replace(/&#39;/g, "'");
        
        // Clean up remaining LaTeX commands (but preserve math placeholders)
        content = content.replace(/\\[a-zA-Z]+\*?\s*/g, ' ');
        content = content.replace(/\{([^}]*)\}/g, '$1');
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ');
        
        // Restore all math expressions exactly as they were
        for (const [placeholder, mathExpr] of Object.entries(mathStore)) {
            content = content.replace(placeholder, mathExpr);
        }
        
        return `<div class="article-theorem"><div class="article-theorem-title">${title}</div>${content.trim()}</div>`;
    }

    processTable(tableContent) {
        const rows = tableContent.split('\\\\');
        let html = '<table class="article-table">';
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
                const cells = row.split('&').map(cell => cell.trim());
                const tag = i === 0 ? 'th' : 'td';
                html += '<tr>' + cells.map(cell => `<${tag}>${this.processTexText(cell)}</${tag}>`).join('') + '</tr>';
            }
        }
        
        html += '</table>';
        return html;
    }

    processTexTextWithEquations(text) {
        // Store for math expressions to preserve them completely
        const mathStore = [];
        let mathCounter = 0;
        
        // FIRST: Extract and preserve already processed equation divs
        text = text.replace(/<div class="article-equation">([\s\S]*?)<\/div>/g, (match, content) => {
            const placeholder = `PROCESSED_EQUATION_${mathCounter++}`;
            mathStore[placeholder] = `<div class="article-equation">${content}</div>`;
            return placeholder;
        });
        
        // Then extract and preserve ALL remaining math expressions
        // Display math: $$...$$
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
            const placeholder = `MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${content}$$`;
            return placeholder;
        });
        
        // Inline math: $...$ (but not currency)
        text = text.replace(/\$([^$\d\s][^$]*?)\$/g, (match, content) => {
            const placeholder = `MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${content}\\)`;
            return placeholder;
        });
        
        // LaTeX inline math: \(...\)
        text = text.replace(/\\\(([^)]+)\\\)/g, (match, content) => {
            const placeholder = `MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${content}\\)`;
            return placeholder;
        });
        
        // LaTeX display math: \[...\]
        text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
            const placeholder = `MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${content}$$`;
            return placeholder;
        });
        
        // Now process text formatting (math is safely stored)
        // Process LaTeX line breaks
        text = text.replace(/\\\\/g, '<br>');
        
        // Process basic text formatting
        text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
        
        // Process citations
        text = text.replace(/\\citep?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');
        
        // Clean up HTML entities before processing LaTeX commands
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&#39;/g, "'");
        
        // Clean up remaining LaTeX commands (but preserve math placeholders)
        text = text.replace(/\\[a-zA-Z]+\*?\s*/g, ' ');
        text = text.replace(/\{([^}]*)\}/g, '$1');
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ');
        
        // Restore all math expressions exactly as they were
        for (const [placeholder, mathExpr] of Object.entries(mathStore)) {
            text = text.replace(placeholder, mathExpr);
        }
        
        return text.trim();
    }

    processTexText(text) {
        // Store for math expressions to preserve them completely
        const mathStore = [];
        let mathCounter = 0;
        
        // First, extract and preserve ALL math expressions
        // Display math: $$...$$
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
            const placeholder = `MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${content}$$`;
            return placeholder;
        });
        
        // Inline math: $...$ (but not currency)
        text = text.replace(/\$([^$\d\s][^$]*?)\$/g, (match, content) => {
            const placeholder = `MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${content}\\)`;
            return placeholder;
        });
        
        // LaTeX inline math: \(...\)
        text = text.replace(/\\\(([^)]+)\\\)/g, (match, content) => {
            const placeholder = `MATH_INLINE_${mathCounter++}`;
            mathStore[placeholder] = `\\(${content}\\)`;
            return placeholder;
        });
        
        // LaTeX display math: \[...\]
        text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
            const placeholder = `MATH_DISPLAY_${mathCounter++}`;
            mathStore[placeholder] = `$$${content}$$`;
            return placeholder;
        });
        
        // Now process text formatting (math is safely stored)
        // Process LaTeX line breaks
        text = text.replace(/\\\\/g, '<br>');
        
        // Process basic text formatting
        text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
        
        // Process citations
        text = text.replace(/\\citep?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');
        
        // Clean up HTML entities before processing LaTeX commands
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&quot;/g, '"');
        text = text.replace(/&#39;/g, "'");
        
        // Clean up remaining LaTeX commands (but preserve math placeholders)
        text = text.replace(/\\[a-zA-Z]+\*?\s*/g, ' ');
        text = text.replace(/\{([^}]*)\}/g, '$1');
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ');
        
        // Restore all math expressions exactly as they were
        for (const [placeholder, mathExpr] of Object.entries(mathStore)) {
            text = text.replace(placeholder, mathExpr);
        }
        
        return text.trim();
    }

    async renderMath() {
        try {
            // Debug: Check what math content we have
            const mathElements = this.articleContentElement.querySelectorAll('.article-equation');
            console.log('Found math elements:', mathElements.length);
            mathElements.forEach((el, i) => {
                console.log(`Math element ${i}:`, el.innerHTML.substring(0, 100));
            });
            
            // Check if KaTeX is available immediately
            if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                renderMathInElement(this.articleContentElement, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false,
                    errorCallback: (msg, err) => {
                        console.warn('KaTeX rendering error:', msg, err);
                    }
                });
                console.log('KaTeX rendering completed successfully');
                return;
            }
            
            // If not available, try waiting a bit
            console.log('KaTeX not immediately available, waiting...');
            await this.waitForKaTeX();
            
            // Try again after waiting
            if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                renderMathInElement(this.articleContentElement, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ],
                    throwOnError: false,
                    errorCallback: (msg, err) => {
                        console.warn('KaTeX rendering error:', msg, err);
                    }
                });
                console.log('KaTeX rendering completed successfully after wait');
            } else {
                console.warn('KaTeX still not available after waiting');
                this.showMathFallback();
            }
        } catch (error) {
            console.error('Error in renderMath:', error);
            console.log('Falling back to raw LaTeX display');
            this.showMathFallback();
        }
    }

    waitForKaTeX(timeout = 2000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkKaTeX = () => {
                if (typeof katex !== 'undefined' && typeof renderMathInElement !== 'undefined') {
                    console.log('KaTeX found after waiting');
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    console.log('KaTeX timeout reached, proceeding with fallback');
                    reject(new Error('KaTeX loading timeout'));
                } else {
                    setTimeout(checkKaTeX, 200);
                }
            };
            
            checkKaTeX();
        });
    }

    showMathFallback() {
        // Show raw LaTeX if KaTeX fails to load
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
