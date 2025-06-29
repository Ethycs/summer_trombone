/**
 * ThemeSwitcher.js - Manages the 'Hacker' and 'Academic' view modes.
 */

import { FileSystemSync } from './FileSystemSync.js';
import { TexParser } from './TexParser.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

export class ThemeSwitcher {
    constructor() {
        this.toggleButton = document.getElementById('mode-toggle');
        this.academicView = document.getElementById('academic-view');
        this.hackerView = document.querySelector('.desktop');
        this.taskbar = document.querySelector('.taskbar');
        this.currentMode = 'hacker'; // or 'academic'
        this.fs = new FileSystemSync();
        this.texParser = new TexParser();
        this.isContentLoaded = false;
    }

    init() {
        if (!this.toggleButton || !this.academicView || !this.hackerView) {
            console.error('ThemeSwitcher: Missing required elements.');
            return;
        }

        this.toggleButton.addEventListener('click', () => this.toggleMode());

        // Check localStorage for saved preference
        const savedMode = localStorage.getItem('themeMode');
        if (savedMode === 'academic') {
            this.setMode('academic', true);
        } else {
            this.setMode('hacker', true);
        }
    }

    toggleMode() {
        const newMode = this.currentMode === 'hacker' ? 'academic' : 'hacker';
        this.setMode(newMode);
    }

    async setMode(mode, isInitialLoad = false) {
        this.currentMode = mode;
        localStorage.setItem('themeMode', mode);

        if (mode === 'academic') {
            document.body.classList.add('academic-mode');
            this.hackerView.style.display = 'none';
            this.taskbar.style.display = 'none';
            this.academicView.style.display = 'block';

            if (!this.isContentLoaded) {
                await this.loadAcademicContent();
            }
            this.injectStylesheet();
        } else {
            document.body.classList.remove('academic-mode');
            this.hackerView.style.display = 'block';
            this.taskbar.style.display = 'flex';
            this.academicView.style.display = 'none';
            this.removeStylesheet();
        }
    }

    injectStylesheet() {
        if (document.getElementById('academic-styles')) return;
        const link = document.createElement('link');
        link.id = 'academic-styles';
        link.rel = 'stylesheet';
        link.href = './css/academic.css';
        document.head.appendChild(link);
    }

    removeStylesheet() {
        const link = document.getElementById('academic-styles');
        if (link) {
            link.remove();
        }
    }

    async loadAcademicContent() {
        this.academicView.innerHTML = '<h1>Loading all content...</h1>';
        try {
            const manifest = await this.fs.getManifest();
            const allFiles = Object.values(manifest.files);

            const contentPromises = allFiles
                .filter(file => file.path.startsWith('blog/posts/') || file.path.startsWith('blog/papers/'))
                .sort((a, b) => new Date(b.modified) - new Date(a.modified))
                .map(file => this.fetchAndRenderFile(file));

            const renderedContent = await Promise.all(contentPromises);
            this.academicView.innerHTML = `<h1>Summer Trombone - Full Archive</h1>${renderedContent.join('')}`;
            this.isContentLoaded = true;

            // Render KaTeX math
            if (window.renderMathInElement) {
                window.renderMathInElement(this.academicView, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                    ]
                });
            }
        } catch (error) {
            console.error('Failed to load academic content:', error);
            this.academicView.innerHTML = '<h1>Error loading content.</h1>';
        }
    }

    async fetchAndRenderFile(file) {
        try {
            const response = await fetch(file.path);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const rawContent = await response.text();
            let contentHtml = '';

            if (file.path.endsWith('.md')) {
                contentHtml = marked(rawContent);
            } else if (file.path.endsWith('.tex')) {
                const parsedTex = this.texParser.parse(rawContent);
                contentHtml = `<h2>${parsedTex.title}</h2><div class="post-meta">${parsedTex.author} - ${parsedTex.date}</div><div>${parsedTex.body}</div>`;
            }

            return `
                <article>
                    <header>
                        <h2>${file.title || file.path}</h2>
                        <p class="post-meta">Last modified: ${new Date(file.modified).toDateString()}</p>
                    </header>
                    ${contentHtml}
                </article>
            `;
        } catch (error) {
            console.error(`Failed to render file ${file.path}:`, error);
            return `<article><h2>Error loading ${file.path}</h2></article>`;
        }
    }
}
