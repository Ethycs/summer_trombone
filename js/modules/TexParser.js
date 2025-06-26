/**
 * TexParser - A dedicated class for parsing TeX content into HTML.
 */
export class TexParser {
    constructor() {
        this.mathStore = {};
        this.mathCounter = 0;
        this.errors = [];
    }

    parse(texContent) {
        // Reset for each parse
        this.mathStore = {};
        this.mathCounter = 0;
        this.errors = [];

        try {
            let html = '';
            const sections = texContent.split(/(?=\\section)/);

            for (let section of sections) {
                if (section.trim()) {
                    html += this.processSection(section);
                }
            }
            
            if (this.errors.length > 0) {
                console.warn('TeX parsing completed with errors:', this.errors);
            }
            
            return html;
        } catch (error) {
            console.error('Fatal error in TeX parsing:', error);
            return '<div class="tex-error">Error parsing TeX content</div>';
        }
    }

    processSection(section) {
        try {
            // 1. Protect ALL Math Content First
            section = this.protectAllMath(section);

            // 2. Process Block-Level Elements
            section = this.parseBlockElements(section);

            // 3. Process Paragraphs and Inline Elements
            let contentHtml = this.parseParagraphs(section);

            // 4. Restore ALL Math Content
            contentHtml = this.restoreMath(contentHtml);

            return `<div class="article-section">${contentHtml}</div>`;
        } catch (error) {
            this.logError('processSection', error, section.substring(0, 100));
            return `<div class="article-section tex-error">Error processing section</div>`;
        }
    }

    protectAllMath(text) {
        try {
            // Protect $$...$$ display math first (fixed regex)
            text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                return placeholder;
            });

            // Protect \[...\] display math
            text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                return placeholder;
            });

            // Protect other display math environments (fixed regex)
            const displayMathRegex = /\\begin\{(equation\*?|align\*?|gather\*?|eqnarray\*?|displaymath|multline\*?)\}([\s\S]*?)\\end\{\1\}/g;
            text = text.replace(displayMathRegex, (match, env, content) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                return placeholder;
            });

            // Protect inline math \(...\)
            text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
                const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = match;
                return placeholder;
            });

            // Protect inline math $...$ (improved regex to avoid false positives)
            // This regex avoids matching: currency ($5), escaped \$, or $ at word boundaries
            const inlineMathRegex = /(?<![\\])\$(?!\d)([^\$\n]+?[^\\\$])\$/g;
            text = text.replace(inlineMathRegex, (match, content) => {
                // Additional validation to avoid false positives
                if (content.match(/^\d+\.?\d*$/) || content.length < 1) {
                    return match; // Don't treat as math
                }
                const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `\\(${content}\\)`;
                return placeholder;
            });

            return text;
        } catch (error) {
            this.logError('protectAllMath', error);
            return text;
        }
    }

    restoreMath(text) {
        try {
            for (const [placeholder, mathExpr] of Object.entries(this.mathStore)) {
                text = text.replace(new RegExp(placeholder, 'g'), () => mathExpr);
            }
            return text;
        } catch (error) {
            this.logError('restoreMath', error);
            return text;
        }
    }

    parseBlockElements(text) {
        text = this.parseHeadings(text);
        text = this.parseTheorems(text);
        text = this.parseLists(text);
        text = this.parseTables(text);
        text = this.parseQuotes(text);
        text = this.parseFigures(text);
        return text;
    }

    parseHeadings(text) {
        try {
            // More robust heading parsing with optional labels
            text = text.replace(/\\section(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, '<h1>$1</h1>');
            text = text.replace(/\\subsection(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, '<h2>$1</h2>');
            text = text.replace(/\\subsubsection(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, '<h3>$1</h3>');
            text = text.replace(/\\paragraph\{([^}]+)\}/g, '<h4>$1</h4>');
            return text;
        } catch (error) {
            this.logError('parseHeadings', error);
            return text;
        }
    }

    parseTheorems(text) {
        try {
            // Extended theorem environments with optional titles
            const theoremRegex = /\\begin\{(theorem|definition|lemma|corollary|proposition|remark|example|proof|claim|fact|observation|note)\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{\1\}/g;
            
            text = text.replace(theoremRegex, (match, env, optTitle, content) => {
                const baseTitle = env.charAt(0).toUpperCase() + env.slice(1);
                const title = optTitle ? `${baseTitle} (${optTitle})` : baseTitle;
                const className = env === 'proof' ? 'article-proof' : 'article-theorem';
                
                // Process the content recursively
                const processedContent = this.processTexText(content);
                
                return `<div class="${className}"><div class="article-theorem-title">${title}</div>${processedContent}</div>`;
            });
            
            return text;
        } catch (error) {
            this.logError('parseTheorems', error);
            return text;
        }
    }

    parseLists(text) {
        try {
            // Handle nested lists recursively
            const processNestedLists = (listContent, listType) => {
                // First process any nested lists
                listContent = this.parseLists(listContent);
                
                // Then process items
                const items = listContent.split(/\\item(?:\[[^\]]*\])?/);
                const processedItems = items
                    .filter(item => item.trim())
                    .map(item => `<li>${this.processTexText(item.trim())}</li>`)
                    .join('');
                
                return listType === 'enumerate' ? `<ol>${processedItems}</ol>` : `<ul>${processedItems}</ul>`;
            };

            // Process enumerate
            text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, 
                (match, content) => processNestedLists(content, 'enumerate'));
            
            // Process itemize
            text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
                (match, content) => processNestedLists(content, 'itemize'));
            
            // Process description lists
            text = text.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g,
                (match, content) => {
                    const items = content.split(/\\item\[([^\]]*)\]/);
                    let html = '<dl>';
                    for (let i = 1; i < items.length; i += 2) {
                        const term = items[i];
                        const desc = items[i + 1] || '';
                        html += `<dt>${this.processTexText(term)}</dt><dd>${this.processTexText(desc.trim())}</dd>`;
                    }
                    html += '</dl>';
                    return html;
                });
            
            return text;
        } catch (error) {
            this.logError('parseLists', error);
            return text;
        }
    }

    parseTables(text) {
        try {
            // Handle tables with or without table environment
            const tableRegex = /\\begin\{table\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g;
            text = text.replace(tableRegex, (match, content) => {
                return this.parseTabularContent(content, true);
            });

            // Handle standalone tabular environments
            const tabularRegex = /\\begin\{tabular\}\{([^}]+)\}([\s\S]*?)\\end\{tabular\}/g;
            text = text.replace(tabularRegex, (match, cols, content) => {
                return this.parseTabularContent(match, false);
            });

            return text;
        } catch (error) {
            this.logError('parseTables', error);
            return text;
        }
    }

    parseTabularContent(content, hasTableWrapper) {
        try {
            // Extract caption if present
            let caption = '';
            const captionMatch = content.match(/\\caption\{([^}]*)\}/);
            if (captionMatch) {
                caption = `<caption>${this.processTexText(captionMatch[1])}</caption>`;
                content = content.replace(captionMatch[0], '');
            }

            // Remove table-specific commands
            content = content.replace(/\\(toprule|midrule|bottomrule|hline|cline\{[^}]*\})/g, '');
            content = content.replace(/\\label\{[^}]*\}/g, '');

            // Extract tabular content
            const tabularMatch = content.match(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/);
            if (!tabularMatch) {
                this.logError('parseTabularContent', 'No tabular environment found');
                return '';
            }

            const tableContent = tabularMatch[1];
            const tableHtml = this.processTableRows(tableContent);

            return `<table class="article-table">${caption}${tableHtml}</table>`;
        } catch (error) {
            this.logError('parseTabularContent', error);
            return '';
        }
    }

    processTableRows(tableContent) {
        try {
            const rows = tableContent.trim().split(/\\\\/);
            let html = '';
            let isHeader = true;

            for (const row of rows) {
                const trimmedRow = row.trim();
                if (trimmedRow === '' || trimmedRow.match(/^\s*\\(hline|midrule|toprule|bottomrule)\s*$/)) {
                    if (html && isHeader) {
                        isHeader = false; // Switch to body after first hline/midrule
                    }
                    continue;
                }

                const cells = trimmedRow.split(/(?<!\\)&/); // Split on & but not \&
                const tag = isHeader ? 'th' : 'td';
                
                html += '<tr>';
                for (const cell of cells) {
                    const cellContent = cell.replace(/\\&/g, '&').trim();
                    html += `<${tag}>${this.processTexText(cellContent)}</${tag}>`;
                }
                html += '</tr>';
            }

            return html;
        } catch (error) {
            this.logError('processTableRows', error);
            return '';
        }
    }

    parseQuotes(text) {
        try {
            // Parse quote environments
            text = text.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, 
                '<blockquote>$1</blockquote>');
            text = text.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, 
                '<blockquote class="quotation">$1</blockquote>');
            
            return text;
        } catch (error) {
            this.logError('parseQuotes', error);
            return text;
        }
    }

    parseFigures(text) {
        try {
            const figureRegex = /\\begin\{figure\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{figure\}/g;
            text = text.replace(figureRegex, (match, content) => {
                // Extract image
                const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
                const captionMatch = content.match(/\\caption\{([^}]*)\}/);
                
                if (imgMatch) {
                    const imgSrc = imgMatch[1];
                    const caption = captionMatch ? `<figcaption>${this.processTexText(captionMatch[1])}</figcaption>` : '';
                    return `<figure class="article-figure"><img src="${imgSrc}" alt="${captionMatch ? captionMatch[1] : ''}">${caption}</figure>`;
                }
                
                return '';
            });
            
            return text;
        } catch (error) {
            this.logError('parseFigures', error);
            return text;
        }
    }

    parseParagraphs(text) {
        try {
            const paragraphs = text.split(/\n\s*\n/);
            let html = '';
            
            for (let para of paragraphs) {
                para = para.trim();
                if (!para) continue;

                // Check if it's already a block element or math placeholder
                if (para.match(/^(__DISPLAY_MATH_\d+__|<(?:h[1-6]|div|ol|ul|table|figure|blockquote|dl))/)) {
                    html += para;
                } else {
                    html += `<p>${this.processTexText(para)}</p>`;
                }
            }
            
            return html;
        } catch (error) {
            this.logError('parseParagraphs', error);
            return text;
        }
    }

    processTexText(text) {
        try {
            // Handle escaped characters
            text = text.replace(/\\([#$%&_{}])/g, '$1');
            
            // Text formatting commands
            text = text.replace(/\\textbf\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<strong>$1</strong>');
            text = text.replace(/\\textit\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<em>$1</em>');
            text = text.replace(/\\emph\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<em>$1</em>');
            text = text.replace(/\\texttt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<code>$1</code>');
            text = text.replace(/\\textsc\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<span class="small-caps">$1</span>');
            text = text.replace(/\\underline\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<u>$1</u>');
            
            // Font size commands
            text = text.replace(/\\tiny\b/g, '<span class="tex-tiny">');
            text = text.replace(/\\small\b/g, '<span class="tex-small">');
            text = text.replace(/\\large\b/g, '<span class="tex-large">');
            text = text.replace(/\\Large\b/g, '<span class="tex-Large">');
            text = text.replace(/\\huge\b/g, '<span class="tex-huge">');
            text = text.replace(/\\Huge\b/g, '<span class="tex-Huge">');
            
            // Handle citations
            text = text.replace(/\\cite(?:p|t|author|year|yearpar)?\{([^}]+)\}/g, 
                '<span class="citation">[$1]</span>');
            
            // Handle references
            text = text.replace(/\\ref\{([^}]+)\}/g, '<a href="#$1" class="ref">$1</a>');
            text = text.replace(/\\eqref\{([^}]+)\}/g, '<a href="#$1" class="ref">($1)</a>');
            text = text.replace(/\\label\{([^}]+)\}/g, '<span id="$1"></span>');
            
            // Handle footnotes
            text = text.replace(/\\footnote\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, 
                '<sup class="footnote">*</sup><span class="footnote-content">$1</span>');
            
            // Handle URLs
            text = text.replace(/\\url\{([^}]+)\}/g, '<a href="$1">$1</a>');
            text = text.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '<a href="$1">$2</a>');
            
            // Line breaks and spacing
            text = text.replace(/\\\\/g, '<br>');
            text = text.replace(/\\newline/g, '<br>');
            text = text.replace(/\\par\b/g, '</p><p>');
            text = text.replace(/\\noindent/g, '');
            
            // Remove other common commands that don't need HTML representation
            text = text.replace(/\\(vspace|hspace|bigskip|medskip|smallskip)\{[^}]*\}/g, '');
            text = text.replace(/\\(centering|raggedright|raggedleft)/g, '');
            
            return text;
        } catch (error) {
            this.logError('processTexText', error, text.substring(0, 50));
            return text;
        }
    }

    logError(method, error, context = '') {
        const errorMsg = {
            method,
            error: error.message || error,
            context: context ? context.substring(0, 100) + '...' : '',
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(errorMsg);
        console.error(`[TexParser.${method}]`, errorMsg);
    }
}