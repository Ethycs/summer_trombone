/**
 * TexParser - A dedicated class for parsing TeX content into HTML.
 */
export class TexParser {
    constructor() {
        this.mathStore = {};
        this.mathCounter = 0;
    }

    parse(texContent) {
        // Reset for each parse
        this.mathStore = {};
        this.mathCounter = 0;

        let html = '';
        const sections = texContent.split(/(?=\\section)/);

        for (let section of sections) {
            if (section.trim()) {
                html += this.processSection(section);
            }
        }
        return html;
    }

    processSection(section) {
        // 1. Protect ALL Math Content First
        section = this.protectAllMath(section);

        // 2. Process Block-Level Elements
        section = this.parseBlockElements(section);

        // 3. Process Paragraphs and Inline Elements
        let contentHtml = this.parseParagraphs(section);

        // 4. Restore ALL Math Content
        contentHtml = this.restoreMath(contentHtml);

        return `<div class="article-section">${contentHtml}</div>`;
    }

    protectAllMath(text) {
        // Protect $$...$$ display math first
        text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
            const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
            this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
            return placeholder;
        });

        // Protect other display math (align, equation)
        const displayMathRegex = /\\begin\{(equation|align)\}\\s\\S]*?\\end\{\\1\}/g;
        text = text.replace(displayMathRegex, (match) => {
            const placeholder = `__DISPLAY_MATH_${this.mathCounter++}__`;
            this.mathStore[placeholder] = `<div class="article-equation">${match}</div>`;
            return placeholder;
        });

        // Protect inline math ($...$)
        const inlineMathRegex = /\$([^$\d\s][^$]*?)\$/g;
        text = text.replace(inlineMathRegex, (match, content) => {
            const placeholder = `__INLINE_MATH_${this.mathCounter++}__`;
            this.mathStore[placeholder] = `\\(${content}\\)`;
            return placeholder;
        });

        return text;
    }

    restoreMath(text) {
        for (const [placeholder, mathExpr] of Object.entries(this.mathStore)) {
            text = text.replace(placeholder, () => mathExpr);
        }
        return text;
    }

    parseBlockElements(text) {
        text = this.parseHeadings(text);
        text = this.parseTheorems(text);
        text = this.parseLists(text);
        text = this.parseTables(text);
        return text;
    }

    parseHeadings(text) {
        text = text.replace(/\\section\{([^}]+)\}/g, '<h1>$1</h1>');
        text = text.replace(/\\subsection\{([^}]+)\}/g, '<h2>$1</h2>');
        text = text.replace(/\\subsubsection\{([^}]+)\}/g, '<h3>$1</h3>');
        return text;
    }

    parseTheorems(text) {
        const theoremRegex = /\begin{(theorem|definition|lemma|corollary|proof)}([\s\S]*?)\end{\1}/g;
        text = text.replace(theoremRegex, (match, env, content) => {
            const title = env.charAt(0).toUpperCase() + env.slice(1);
            const className = env === 'proof' ? 'article-proof' : 'article-theorem';
            return `<div class="${className}"><div class="article-theorem-title">${title}</div>${this.processTexText(content)}</div>`;
        });
        return text;
    }

    parseLists(text) {
        text = text.replace(/\begin{enumerate}([\s\S]*?)\end{enumerate}/g,
            (match, listContent) => '<ol>' + this.processListItems(listContent) + '</ol>');
        text = text.replace(/\begin{itemize}([\s\S]*?)\end{itemize}/g,
            (match, listContent) => '<ul>' + this.processListItems(listContent) + '</ul>');
        return text;
    }

    processListItems(listContent) {
        const items = listContent.split(/\\item/);
        return items.filter(item => item.trim()).map(item => `<li>${this.processTexText(item.trim())}</li>`).join('');
    }

    parseTables(text) {
        const tableRegex = /\\begin\{table\}([\s\S]*?)\\end\{table\}/g;
        text = text.replace(tableRegex, (match, content) => {
            // Remove table-specific commands from the entire table block
            content = content.replace(/\\toprule|\\midrule|\\bottomrule|\\caption\{[^}]*\}|\\label\{[^}]*\}/g, '');

            const tabularRegex = /\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/;
            const tabularMatch = content.match(tabularRegex);
            if (!tabularMatch) return ''; // No tabular environment found

            const tableContent = tabularMatch[1];
            return `<table class="article-table">${this.processTableRows(tableContent)}</table>`;
        });
        return text;
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

    parseParagraphs(text) {
        const paragraphs = text.split(/\n\s*\n/);
        let html = '';
        for (let para of paragraphs) {
            para = para.trim();
            if (!para) continue;

            if (para.startsWith('__DISPLAY_MATH_') || para.match(/^<(h[1-3]|div|ol|ul|table)/)) {
                html += para;
            } else {
                html += `<p>${this.processTexText(para)}</p>`;
            }
        }
        return html;
    }

    processTexText(text) {
        // Handle escaped characters like \$ so they don't get processed as math
        text = text.replace(/\\\$/g, '$');
        text = text.replace(/\\%/g, '%');
        
        text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
        text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
        text = text.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>');
        text = text.replace(/\\citep?\{([^}]+)\}/g, '<span class="citation">[$1]</span>');
        text = text.replace(/\\\\/g, '<br>');
        return text;
    }
}