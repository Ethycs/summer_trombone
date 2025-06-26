/**
 * TexParser - Enhanced robust TeX parser with comprehensive error handling
 */
export class TexParser {
    constructor() {
        this.mathStore = {};
        this.mathCounter = 0;
        this.errors = [];
        this.debugMode = false; // Set to true for verbose logging
    }

    parse(texContent) {
        // Reset for each parse
        this.mathStore = {};
        this.mathCounter = 0;
        this.errors = [];

        console.log('[TexParser] Starting parse...');

        try {
            let html = '';
            const sections = texContent.split(/(?=\\section)/);

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                if (section.trim()) {
                    if (this.debugMode) {
                        console.log(`[TexParser] Processing section ${i + 1}/${sections.length}`);
                    }
                    html += this.processSection(section);
                }
            }

            if (this.errors.length > 0) {
                console.warn('[TexParser] Parse completed with errors:', {
                    errorCount: this.errors.length,
                    errors: this.errors
                });
            } else {
                console.log('[TexParser] Parse completed successfully');
            }

            return html;
        } catch (error) {
            console.error('[TexParser] Fatal parsing error:', error);
            this.logError('parse', error, texContent.substring(0, 200));
            return '<div class="tex-parser-error">Failed to parse TeX content. See console for details.</div>';
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
            let protectedCount = 0;

            // Protect $$...$$ display math
            text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                protectedCount++;
                return placeholder;
            });

            // Protect \[...\] display math
            text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                protectedCount++;
                return placeholder;
            });

            // Protect display math environments (fixed regex)
            const displayEnvs = [
                'equation\\*?',
                'align\\*?',
                'gather\\*?',
                'eqnarray\\*?',
                'displaymath',
                'multline\\*?',
                'flalign\\*?',
                'alignat\\*?'
            ].join('|');
            
            const displayMathRegex = new RegExp(
                `\\\\begin\\{(${displayEnvs})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
                'g'
            );

            text = text.replace(displayMathRegex, (match, env, content) => {
                const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
                protectedCount++;
                return placeholder;
            });

            // Protect \(...\) inline math
            text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
                const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = match;
                protectedCount++;
                return placeholder;
            });

            // Protect $...$ inline math (improved regex)
            // Negative lookbehind for backslash, avoid currency patterns
            const inlineMathRegex = /(?<!\\)\$(?!\s)(?!\d+\.?\d*\s)([^\$\n]+?)\$/g;
            
            text = text.replace(inlineMathRegex, (match, content) => {
                // Additional validation
                if (content.match(/^\d+\.?\d*$/) || // Just numbers
                    content.match(/^\s*$/) ||        // Just whitespace
                    content.length === 0) {          // Empty
                    return match; // Don't treat as math
                }
                
                const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `\\(${content}\\)`;
                protectedCount++;
                return placeholder;
            });

            if (this.debugMode) {
                console.log(`[TexParser.protectAllMath] Protected ${protectedCount} math expressions`);
            }

            return text;
        } catch (error) {
            this.logError('protectAllMath', error);
            return text;
        }
    }

    restoreMath(text) {
        try {
            let restoredCount = 0;
            
            for (const [placeholder, mathExpr] of Object.entries(this.mathStore)) {
                // Use global replace to handle multiple occurrences
                const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                text = text.replace(regex, () => {
                    restoredCount++;
                    return mathExpr;
                });
            }

            if (this.debugMode) {
                console.log(`[TexParser.restoreMath] Restored ${restoredCount} math expressions`);
            }

            return text;
        } catch (error) {
            this.logError('restoreMath', error);
            return text;
        }
    }

    parseBlockElements(text) {
        const steps = [
            { name: 'headings', fn: () => this.parseHeadings(text) },
            { name: 'theorems', fn: () => this.parseTheorems(text) },
            { name: 'lists', fn: () => this.parseLists(text) },
            { name: 'tables', fn: () => this.parseTables(text) },
            { name: 'quotes', fn: () => this.parseQuotes(text) },
            { name: 'abstracts', fn: () => this.parseAbstracts(text) }
        ];

        for (const step of steps) {
            try {
                text = step.fn();
            } catch (error) {
                this.logError(`parseBlockElements.${step.name}`, error);
            }
        }

        return text;
    }

    parseHeadings(text) {
        try {
            // Support optional arguments and labels
            const headingPatterns = [
                { regex: /\\section(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, tag: 'h1' },
                { regex: /\\subsection(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, tag: 'h2' },
                { regex: /\\subsubsection(?:\[[^\]]*\])?\{([^}]+)\}(?:\s*\\label\{[^}]+\})?/g, tag: 'h3' },
                { regex: /\\paragraph\{([^}]+)\}/g, tag: 'h4' },
                { regex: /\\subparagraph\{([^}]+)\}/g, tag: 'h5' }
            ];

            for (const { regex, tag } of headingPatterns) {
                text = text.replace(regex, (match, content) => {
                    const processedContent = this.processInlineTeX(content);
                    return `<${tag}>${processedContent}</${tag}>`;
                });
            }

            return text;
        } catch (error) {
            this.logError('parseHeadings', error);
            return text;
        }
    }

    parseTheorems(text) {
        try {
            const theoremEnvs = [
                'theorem', 'definition', 'lemma', 'corollary', 
                'proposition', 'proof', 'remark', 'example',
                'claim', 'fact', 'observation', 'note'
            ].join('|');

            const theoremRegex = new RegExp(
                `\\\\begin\\{(${theoremEnvs})\\}(?:\\[([^\\]]*)\\])?([\\s\\S]*?)\\\\end\\{\\1\\}`,
                'g'
            );

            text = text.replace(theoremRegex, (match, env, optTitle, content) => {
                const baseTitle = env.charAt(0).toUpperCase() + env.slice(1);
                const title = optTitle ? `${baseTitle} (${optTitle})` : baseTitle;
                const className = env === 'proof' ? 'article-proof' : 'article-theorem';
                
                // Process content recursively
                const processedContent = this.processInlineTeX(content.trim());
                
                return `<div class="${className}">` +
                       `<div class="article-theorem-title">${title}</div>` +
                       `<div class="article-theorem-content">${processedContent}</div>` +
                       `</div>`;
            });

            return text;
        } catch (error) {
            this.logError('parseTheorems', error);
            return text;
        }
    }

    parseLists(text) {
        try {
            // Handle enumerate
            text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (match, content) => {
                return '<ol>' + this.processListItems(content) + '</ol>';
            });

            // Handle itemize
            text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, content) => {
                return '<ul>' + this.processListItems(content) + '</ul>';
            });

            // Handle description lists
            text = text.replace(/\\begin\{description\}([\s\S]*?)\\end\{description\}/g, (match, content) => {
                const items = content.split(/\\item\[([^\]]*)\]/);
                let html = '<dl>';
                
                for (let i = 1; i < items.length; i += 2) {
                    const term = items[i];
                    const desc = items[i + 1] || '';
                    html += `<dt>${this.processInlineTeX(term)}</dt>`;
                    html += `<dd>${this.processInlineTeX(desc.trim())}</dd>`;
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

    processListItems(listContent) {
        try {
            // Split by \item, handling optional arguments
            const items = listContent.split(/\\item(?:\[[^\]]*\])?/);
            
            return items
                .filter(item => item.trim())
                .map(item => {
                    const processedItem = this.processInlineTeX(item.trim());
                    return `<li>${processedItem}</li>`;
                })
                .join('');
        } catch (error) {
            this.logError('processListItems', error);
            return '';
        }
    }

    parseTables(text) {
        try {
            // Handle table environment
            const tableRegex = /\\begin\{table\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\}/g;
            text = text.replace(tableRegex, (match, content) => {
                return this.parseTableContent(content, true);
            });

            // Handle standalone tabular
            const tabularRegex = /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/g;
            text = text.replace(tabularRegex, (match) => {
                return this.parseTableContent(match, false);
            });

            return text;
        } catch (error) {
            this.logError('parseTables', error);
            return text;
        }
    }

    parseTableContent(content, hasWrapper) {
        try {
            // Extract caption
            let caption = '';
            const captionMatch = content.match(/\\caption\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
            if (captionMatch) {
                caption = `<caption>${this.processInlineTeX(captionMatch[1])}</caption>`;
                content = content.replace(captionMatch[0], '');
            }

            // Remove table formatting commands
            content = content.replace(/\\(toprule|midrule|bottomrule|hline|cline\{[^}]*\})/g, '');
            content = content.replace(/\\label\{[^}]*\}/g, '');

            // Extract tabular content
            const tabularMatch = content.match(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/);
            if (!tabularMatch) {
                this.logError('parseTableContent', 'No tabular environment found');
                return '';
            }

            const tableContent = tabularMatch[1];
            const tableRows = this.processTableRows(tableContent);

            return `<table class="article-table">${caption}${tableRows}</table>`;
        } catch (error) {
            this.logError('parseTableContent', error);
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
                
                // Skip empty rows or formatting commands
                if (!trimmedRow || trimmedRow.match(/^\\(hline|midrule|toprule|bottomrule)$/)) {
                    if (html && isHeader) {
                        isHeader = false; // Switch to body after header
                    }
                    continue;
                }

                // Split cells, handling escaped &
                const cells = trimmedRow.split(/(?<!\\)&/).map(cell => cell.replace(/\\&/g, '&'));
                const tag = isHeader ? 'th' : 'td';
                
                html += '<tr>';
                for (const cell of cells) {
                    const processedCell = this.processInlineTeX(cell.trim());
                    html += `<${tag}>${processedCell}</${tag}>`;
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
            text = text.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (match, content) => {
                return `<blockquote>${this.processInlineTeX(content)}</blockquote>`;
            });

            text = text.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, (match, content) => {
                return `<blockquote class="quotation">${this.processInlineTeX(content)}</blockquote>`;
            });

            return text;
        } catch (error) {
            this.logError('parseQuotes', error);
            return text;
        }
    }

    parseAbstracts(text) {
        try {
            text = text.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (match, content) => {
                const processedContent = this.processInlineTeX(content);
                return `<div class="article-abstract"><h2>Abstract</h2>${processedContent}</div>`;
            });

            // Handle inline abstract command
            text = text.replace(/\\abstract\{([\s\S]*?)\}/g, (match, content) => {
                const processedContent = this.processInlineTeX(content);
                return `<div class="article-abstract"><h2>Abstract</h2>${processedContent}</div>`;
            });

            return text;
        } catch (error) {
            this.logError('parseAbstracts', error);
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
                    const processedPara = this.processInlineTeX(para);
                    html += `<p>${processedPara}</p>`;
                }
            }

            return html;
        } catch (error) {
            this.logError('parseParagraphs', error);
            return text;
        }
    }

    processInlineTeX(text) {
        try {
            // Handle escaped characters
            text = text.replace(/\\([#$%&_{}~^])/g, '$1');

            // Text formatting
            const formattingCommands = [
                { regex: /\\textbf\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<strong>$1</strong>' },
                { regex: /\\textit\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<em>$1</em>' },
                { regex: /\\emph\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<em>$1</em>' },
                { regex: /\\texttt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<code>$1</code>' },
                { regex: /\\textsc\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<span class="small-caps">$1</span>' },
                { regex: /\\underline\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<u>$1</u>' },
                { regex: /\\textrm\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<span class="tex-rm">$1</span>' },
                { regex: /\\textsf\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, replacement: '<span class="tex-sf">$1</span>' }
            ];

            for (const { regex, replacement } of formattingCommands) {
                text = text.replace(regex, replacement);
            }

            // Citations
            text = text.replace(/\\cite(?:p|t|author|year|yearpar)?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');

            // References
            text = text.replace(/\\ref\{([^}]+)\}/g, '<a href="#$1" class="ref">$1</a>');
            text = text.replace(/\\eqref\{([^}]+)\}/g, '<a href="#$1" class="ref">($1)</a>');
            text = text.replace(/\\label\{([^}]+)\}/g, '<span id="$1"></span>');

            // URLs
            text = text.replace(/\\url\{([^}]+)\}/g, '<a href="$1">$1</a>');
            text = text.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '<a href="$1">$2</a>');

            // Footnotes
            text = text.replace(/\\footnote\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
                '<sup class="footnote">*</sup><span class="footnote-content">$1</span>');

            // Line breaks and spacing
            text = text.replace(/\\\\/g, '<br>');
            text = text.replace(/\\newline/g, '<br>');
            text = text.replace(/\\par\b/g, '</p><p>');

            // Remove spacing commands
            text = text.replace(/\\(vspace|hspace)\{[^}]*\}/g, '');
            text = text.replace(/\\(bigskip|medskip|smallskip|noindent)/g, '');

            // Special characters
            text = text.replace(/\\ldots/g, '…');
            text = text.replace(/\\dots/g, '…');
            text = text.replace(/\\quad/g, ' ');
            text = text.replace(/\\qquad/g, '  ');
            text = text.replace(/\\,/g, ' ');
            text = text.replace(/\\ /g, ' ');
            text = text.replace(/\\~/g, '&nbsp;');

            return text;
        } catch (error) {
            this.logError('processInlineTeX', error, text.substring(0, 50));
            return text;
        }
    }

    // Alias for backward compatibility
    processTexText(text) {
        return this.processInlineTeX(text);
    }

    logError(method, error, context = '') {
        const errorInfo = {
            method: `TexParser.${method}`,
            message: error.message || String(error),
            stack: error.stack,
            context: context ? context.substring(0, 200) + '...' : undefined,
            timestamp: new Date().toISOString()
        };

        this.errors.push(errorInfo);
        console.error(`[TexParser.${method}] Error:`, errorInfo);
    }

    // Debug helper
    enableDebugMode() {
        this.debugMode = true;
        console.log('[TexParser] Debug mode enabled');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('[TexParser] Debug mode disabled');
    }

    // Get parsing statistics
    getParsingStats() {
        return {
            mathExpressions: Object.keys(this.mathStore).length,
            errors: this.errors.length,
            errorDetails: this.errors
        };
    }
}