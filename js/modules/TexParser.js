/**
 * TexParser - A dedicated class for parsing TeX content into HTML.
 */

const INLINE_CMD = {
  textbf : ['<strong>','</strong>'],
  emph   : ['<em>',     '</em>'],
  textit : ['<em>',     '</em>'],
  texttt : ['<code>',   '</code>']
};

class TexParser {
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
                html += `<div class="article-title">${this.processTexText(titleParts[0])}</div>`;
                if (titleParts[1]) {
                    html += `<div class="article-subtitle">${this.processTexText(titleParts[1])}</div>`;
                }
            }
            
            if (authorMatch) {
                html += `<div class="article-author">${this.processTexText(authorMatch[1])}</div>`;
            }
            
            if (abstractMatch) {
                html += `<div class="article-abstract">
                    <strong>Abstract:</strong><br>
                    ${this.processTexText(abstractMatch[1])}
                </div>`;
            }
            
            let content = documentMatch[1];
            content = content.replace(/\\maketitle\s*/g, '');
            content = content.replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/g, '');

            const sections = content.split(/(?=\\section)/);

            for (let section of sections) {
                if (section.trim()) {
                    html += this.processSection(section);
                }
            }

            if (this.errors.length > 0) {
                console.warn('[TexParser] Parse completed with errors:', this.errors);
            }
            
            return html;
        } catch (error) {
            this.logError('parse', error);
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
            this.logError('processSection', error);
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

            // Protect \( … \) inline math – captures an optional trailing line-break.
            text = text.replace(
            /\\\(([\s\S]*?)(?<!\\)\\\)(\\\\\s*)?/g,           // ①
            (_, body, breaker = '') => {
                const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
                this.mathStore[placeholder] = `\\(${body}\\)`;
                protectedCount++;
                return placeholder + breaker;                  // ②
            }
            );

            // Protect $...$ inline math (improved regex)
            // Negative lookbehind for backslash, avoid currency patterns
            const inlineMathRegex = /(?<!\\)\$((?:\\\$|[^$])*)(?<!\\)\$/g;
            
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
        text = this.parseHeadings(text);
        text = this.parseTheorems(text);
        text = this.parseLists(text);
        text = this.parseTables(text);
        text = this.parseBibliography(text);
        text = this.parseAppendix(text);
        return text;
    }

    parseHeadings(text) {
        try {
            text = text.replace(/\\section\{([^}]+)\}/g, '<h1>$1</h1>');
            text = text.replace(/\\subsection\{([^}]+)\}/g, '<h2>$1</h2>');
            text = text.replace(/\\subsubsection\{([^}]+)\}/g, '<h3>$1</h3>');
            text = text.replace(/\\paragraph\{([^}]+)\}/g, '<h4>$1</h4>');
            return text;
        } catch (error) {
            this.logError('parseHeadings', error);
            return text;
        }
    }

    parseTheorems(text) {
        try {
            const theoremRegex = /\\begin\{(theorem|definition|lemma|corollary|proposition|proof|remark|example)\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{\1\}/g;
            
            text = text.replace(theoremRegex, (match, env, optTitle, content) => {
                const baseTitle = env.charAt(0).toUpperCase() + env.slice(1);
                const title = optTitle ? `${baseTitle} (${optTitle})` : baseTitle;
                const className = env === 'proof' ? 'article-proof' : 'article-theorem';
                return `<div class="${className}"><div class="article-theorem-title">${title}</div>${this.processTexText(content.trim())}</div>`;
            });
            
            return text;
        } catch (error) {
            this.logError('parseTheorems', error);
            return text;
        }
    }

    parseLists(text) {
        try {
            text = text.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
                (match, listContent) => '<ol>' + this.processListItems(listContent) + '</ol>');
            
            text = text.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
                (match, listContent) => '<ul>' + this.processListItems(listContent) + '</ul>');
            
            return text;
        } catch (error) {
            this.logError('parseLists', error);
            return text;
        }
    }

    processListItems(listContent) {
        const items = listContent.split(/\\item/);
        return items.filter(item => item.trim())
                   .map(item => `<li>${this.processTexText(item.trim())}</li>`)
                   .join('');
    }

    parseTables(text) {
        try {
            const tableRegex = /\\begin\{table\}([\s\S]*?)\\end\{table\}/g;
            text = text.replace(tableRegex, (match, content) => {
                // Extract caption if present
                let caption = '';
                const captionMatch = content.match(/\\caption\{([^}]*)\}/);
                if (captionMatch) {
                    caption = `<caption>${this.processTexText(captionMatch[1])}</caption>`;
                    content = content.replace(captionMatch[0], '');
                }

                // Remove table-specific commands
                content = content.replace(/\\toprule|\\midrule|\\bottomrule|\\hline/g, '');
                content = content.replace(/\\label\{[^}]*\}/g, '');

                const tabularRegex = /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/;
                const tabularMatch = content.match(tabularRegex);
                if (!tabularMatch) return '';

                const tableContent = tabularMatch[1];
                return `<table class="article-table">${caption}${this.processTableRows(tableContent)}</table>`;
            });
            
            return text;
        } catch (error) {
            this.logError('parseTables', error);
            return text;
        }
    }

    processTableRows(tableContent) {
        const rows = tableContent.trim().split(/\\\\/);
        let html = '';
        let isFirstRow = true;

        for (const row of rows) {
            if (row.trim() === '') continue;
            const cells = row.split('&');
            const tag = isFirstRow ? 'th' : 'td';
            html += '<tr>';
            for (const cell of cells) {
                html += `<${tag}>${this.processTexText(cell.trim())}</${tag}>`;
            }
            html += '</tr>';
            isFirstRow = false;
        }
        return html;
    }

    parseBibliography(text) {
        try {
            text = text.replace(/\\bibliographystyle\{[^}]+\}/g, '');
            
            text = text.replace(/\\begin\{thebibliography\}\{[^}]*\}([\s\S]*?)\\end\{thebibliography\}/g,
                (match, content) => {
                    const items = content.split(/\\bibitem/);
                    let html = '<div class="bibliography"><h2>References</h2><ol>';
                    
                    for (let i = 1; i < items.length; i++) {
                        const item = items[i];
                        const labelMatch = item.match(/^\[([^\]]+)\]\{([^}]+)\}/);
                        if (labelMatch) {
                            const contentText = item.substring(labelMatch[0].length).trim();
                            html += `<li>${this.processTexText(contentText)}</li>`;
                        }
                    }
                    
                    html += '</ol></div>';
                    return html;
                });
            
            return text;
        } catch (error) {
            this.logError('parseBibliography', error);
            return text;
        }
    }

    parseAppendix(text) {
        try {
            text = text.replace(/\\appendix/g, '<div class="appendix"></div>');
            return text;
        } catch (error) {
            this.logError('parseAppendix', error);
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

                if (para.startsWith('__DISPLAY_MATH_')) {
                    html += para + '\n';
                    continue;
                }

                const lines = para.split('\n');
                const processedLines = lines.map(line => {
                    if (line.match(/^<(h[1-4]|div|ol|ul|table|li)/)) {
                        return line; // Don't process lines that are already HTML blocks
                    }
                    return this.processTexText(line);
                });
                
                const blockContent = processedLines.join('');

                // Wrap in <p> only if it's not already a block element.
                if (blockContent.match(/^<(h[1-4]|div|ol|ul|table)/)) {
                    html += blockContent + '\n';
                } else {
                    html += `<p>${blockContent}</p>\n`;
                }
            }
            
            return html.trim();
        } catch (error) {
            this.logError('parseParagraphs', error);
            return text;
        }
    }

  /* ----------------------------------------------------------------
   * 1.  N E W   M E T H O D  –   balanced–brace inline scanner
   * ---------------------------------------------------------------- */
  parseInline(src) {
    let i = 0, out = '';

    const eatBlock = () => {           // nested-brace helper
      let depth = 0, buf = '';
      while (i < src.length) {
        const ch = src[i++];
        if (ch === '\\') { buf += ch + (src[i] ?? ''); i++;          }
        else if (ch === '{') { depth++; buf += ch + eatBlock();      }
        else if (ch === '}') { if (depth-- === 0) return buf; buf+=ch}
        else               { buf += ch;                              }
      }
      throw new Error('Unbalanced brace in inline command');
    };

    while (i < src.length) {
      if (src[i] === '\\') {
        const m = /^\\([A-Za-z]+)\s*\{/.exec(src.slice(i));
        if (m && INLINE_CMD[m[1]]) {
          const cmd = m[1];
          i += m[0].length;                     // skip “\cmd{”
          const inner = eatBlock();
          out += INLINE_CMD[cmd][0]
               + this.parseInline(inner)        // recursion!
               + INLINE_CMD[cmd][1];
          i++;                                  // past the closing '}'
          continue;
        }
      }
      out += src[i++];
    }
    return out;
  }

  /* ----------------------------------------------------------------
   * 2.  replace the old “step 2” of processTexText
   * ---------------------------------------------------------------- */
processTexText(text) {
  /* =========================================================
   * 1.  Expand inline commands such as \textbf{ … } (nested)
   * ======================================================= */
  text = this.parseInline(text);

  /* =========================================================
   * 2.  Font-size commands
   *      –  \small{…}  (braced)
   *      –  \small …   (switch to end-of-line)
   *    NESTED matches “one level of balanced braces”.
   * ======================================================= */
  const NESTED   = '([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)';   //  ← only *one* back-slash per escape
  const SIZES    = [
    'tiny','scriptsize','footnotesize','small','normalsize',
    'large','Large','LARGE','huge','Huge'
  ];

  SIZES.forEach(cmd => {
    /* \cmd{…} ------------------------------------------------ */
    const reBraced  = new RegExp('\\\\' + cmd + '\\s*\\{' + NESTED + '\\}', 'g');
    text = text.replace(reBraced, `<span class="tex-${cmd}">$1</span>`);

    /* \cmd … <EOL> ----------------------------------------- */
    const reSwitch  = new RegExp('\\\\' + cmd + '\\s+([^\\n]*)', 'g');
    text = text.replace(reSwitch, `<span class="tex-${cmd}">$1</span>`);
  });

  /* =========================================================
   * 3.  Citations  (\citep, \citet)
   * ======================================================= */
  const citeToLinks = (keys, bare = false) =>
    keys.split(',').map(k => k.trim())
        .map(k => `<a href="#ref-${k}" class="citation">${bare ? k : `[${k}]`}</a>`)
        .join(', ');

  // \citep{key1,key2}  →  ([key1], [key2])
  text = text.replace(/\\citep\{([^}]+)\}/g,
                      (_, keys) => `(${citeToLinks(keys)})`);

  // \citet{key}        →  key
  text = text.replace(/\\citet\{([^}]+)\}/g,
                      (_, keys) => citeToLinks(keys, /* bare = */ true));

  /* =========================================================
   * 4.  Line-break helpers
   * ======================================================= */
  text = text.replace(/\\\\/g, '<br>');
  text = text.replace(/\\newblock/g, ' ');

  /* =========================================================
   * 5.  Escaped specials – leave *last* so earlier markup
   *    stays detectable.
   * ======================================================= */
  const specials = {
    '#':'&#35;', '$':'&#36;', '%':'&#37;', '&':'&amp;',
    '_':'&#95;', '{':'&#123;', '}':'&#125;'
  };
  return text.replace(/\\([#$%&_{}])/g, (_, c) => specials[c]);
}


    logError(method, error, context = '') {
        const errorInfo = {
            method: `TexParser.${method}`,
            message: error.message || String(error),
            context: context ? context.substring(0, 100) + '...' : undefined
        };
        
        this.errors.push(errorInfo);
        console.error(`[TexParser.${method}] Error:`, errorInfo);
    }
}

// Export for module environments, or attach to self for worker environments
if (typeof exports !== 'undefined') {
    exports.TexParser = TexParser;
} else {
    self.TexParser = TexParser;
}
