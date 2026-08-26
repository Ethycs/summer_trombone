/**
 * Academic Mode View - A file browser and article list that redirects to unified viewer
 * Reuses FileTreeWidget and TerminalContentLoader components
 */

import { FileTreeWidget } from './FileTreeWidget.js';
import { TerminalContentLoader } from './TerminalContentLoader.js';
import { MarkdownArticleSystem } from './MarkdownArticleSystem.js';
import { TexPaperSystem } from './TexPaperSystem.js';
import { buildShareUrl } from './DocumentRoute.js';
import { copyShareUrl } from './clipboard.js';
import {
    escapeHtml,
    extractContentMetadata,
    sitePathToHref
} from './contentMetadata.js';

export class AcademicModeView {
    constructor(containerElement, fileSystemSync, terminalEffects) {
        if (!containerElement) {
            throw new Error('AcademicModeView requires a container element');
        }
        
        this.container = containerElement;
        this.fs = fileSystemSync;
        this.terminalEffects = terminalEffects;
        this.currentArticle = null;
        this.isVisible = false;

        // Components
        this.fileTree = null;
        this.contentLoader = null;
        this.articleViewer = null;
        // Lazily created viewers for the in-place document panel, one per type
        this.documentSystems = {};

        this.init();
    }
    
    async init() {
        this.setupLayout();
        await this.initializeComponents();
        this.attachGlobalListeners();
    }
    
    setupLayout() {
        this.container.classList.add('academic-mode-view');
        this.container.innerHTML = `
            <div class="academic-layout">
                <div class="academic-header">
                    <h1>Summer Trombone: AI Research and Development</h1>
                    <div class="academic-controls">
                        <button type="button" class="academic-copy-link" style="display: none;"
                                title="Copy link to this document" aria-label="Copy link to this document">⧉ Copy link</button>
                    </div>
                </div>

                <div class="academic-body">
                    <div class="academic-split-view">
                        <div class="academic-file-browser">
                            <h2>File Explorer</h2>
                            <div id="academic-file-tree"></div>
                        </div>

                        <div class="academic-content-list">
                            <h2>Recent Articles</h2>
                            <div id="academic-content-loader"></div>
                        </div>
                    </div>

                    <div class="academic-document" style="display: none;">
                        <button type="button" class="academic-back">← Back to index</button>
                        <!-- One viewer per content type: MarkdownArticleSystem and
                             TexPaperSystem each bind to their own .article-list /
                             .article-content pair. The list is redundant here. -->
                        <div class="academic-document-viewer" data-type="article" style="display: none;">
                            <div class="article-list" style="display: none;"></div>
                            <div class="article-content"></div>
                        </div>
                        <div class="academic-document-viewer" data-type="paper" style="display: none;">
                            <div class="article-list" style="display: none;"></div>
                            <div class="article-content"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async initializeComponents() {
        // Initialize FileTreeWidget in academic mode (without its own FileSystemSync)
        const fileTreeContainer = this.container.querySelector('#academic-file-tree');
        this.fileTree = new FileTreeWidget(fileTreeContainer);
        // Override its FileSystemSync with the shared one
        this.fileTree.fs = this.fs;
        await this.fileTree.render();
        
        // Initialize TerminalContentLoader for recent articles
        const contentLoaderContainer = this.container.querySelector('#academic-content-loader');
        this.contentLoader = new TerminalContentLoader(contentLoaderContainer, this.fs);
        // Remove terminal-specific elements for academic mode
        this.contentLoader.render = this.createAcademicContentRenderer();
        
        // Attach event listeners for file opening
        this.attachComponentListeners();
    }
    
    createAcademicContentRenderer() {
        // Add renderAcademicPost method to contentLoader
        this.contentLoader.renderAcademicPost = function(post) {
            const formattedDate = this.formatDate(post.date);
            const typeLabel = post.type === 'paper' ? '[PAPER]' : '[POST]';
            const typeClass = post.type === 'paper' ? 'paper' : 'post';
            const href = this.getContentHref(post);
            const dateAttribute = post.date ? ` datetime="${escapeHtml(post.date)}"` : '';

            return `
                <article class="terminal-post academic-post ${typeClass}" data-path="${escapeHtml(post.path)}">
                    <header class="post-header">
                        <span class="post-type">${typeLabel}</span>
                        <h2 class="post-title"><a href="${escapeHtml(href)}" class="continue-reading" data-path="${escapeHtml(post.path)}">${escapeHtml(post.title)}</a></h2>
                        <time class="post-date"${dateAttribute}>${escapeHtml(formattedDate)}</time>
                    </header>
                    <div class="post-summary">
                        <p>${escapeHtml(post.summary)}</p>
                    </div>
                    <footer class="post-footer">
                        <a href="${escapeHtml(href)}" class="continue-reading" data-path="${escapeHtml(post.path)}">
                            Continue reading →
                        </a>
                    </footer>
                </article>
            `;
        };
        
        return function() {
            this.container.classList.add('academic-content-list');
            
            if (this.posts.length === 0) {
                this.container.innerHTML = '<p class="no-articles">No articles found</p>';
                return;
            }
            
            // Render without pagination in academic mode - show all
            this.container.innerHTML = `
                <div class="academic-posts">
                    ${this.posts.map(post => this.renderAcademicPost(post)).join('')}
                </div>
            `;
        }.bind(this.contentLoader);
    }
    
    attachComponentListeners() {
        // Listen for file-open events from both components
        this.container.addEventListener('file-open', (event) => {
            event.stopPropagation(); // Prevent bubbling to main app
            event.preventDefault();
            this.openDocument(event.detail.path);
        });

        this.container.querySelector('.academic-back')
            ?.addEventListener('click', () => this.closeDocument());

        this.container.querySelector('.academic-copy-link')
            ?.addEventListener('click', (event) => this.copyCurrentLink(event.currentTarget));
    }

    attachGlobalListeners() {
        // Global event listeners can be added here if needed
    }

    /**
     * The academic counterpart to the fullscreen terminal window: render the
     * document in place instead of navigating to the static publication page.
     * Reuses the existing viewers, so markdown/TeX rendering is unchanged.
     */
    async openDocument(sourcePath) {
        const panel = this.container.querySelector('.academic-document');
        const splitView = this.container.querySelector('.academic-split-view');
        if (!panel || !splitView) return;

        const filename = String(sourcePath).split('/').pop();
        const type = /\.tex$/i.test(filename) ? 'paper' : 'article';
        const viewer = panel.querySelector(`.academic-document-viewer[data-type="${type}"]`);
        if (!viewer) return;

        if (!this.documentSystems[type]) {
            try {
                const System = type === 'paper' ? TexPaperSystem : MarkdownArticleSystem;
                const system = new System(viewer, this.terminalEffects, this.fs);
                await system.init();
                this.documentSystems[type] = system;
            } catch (error) {
                console.error('[AcademicModeView] Failed to create document viewer:', error);
                return;
            }
        }

        panel.querySelectorAll('.academic-document-viewer').forEach(node => {
            node.style.display = node === viewer ? 'block' : 'none';
        });

        splitView.style.display = 'none';
        panel.style.display = 'block';

        this.currentArticle = sourcePath;
        this.updateCopyLink(sourcePath);

        await this.documentSystems[type].loadArticle(filename);
    }

    closeDocument() {
        const panel = this.container.querySelector('.academic-document');
        const splitView = this.container.querySelector('.academic-split-view');

        if (panel) panel.style.display = 'none';
        if (splitView) splitView.style.display = '';

        this.currentArticle = null;
        this.updateCopyLink(null);
    }

    canonicalPathFor(sourcePath) {
        if (!sourcePath) return null;
        const entry = this.fs?.get(sourcePath) || {};
        if (entry.canonicalPath) return entry.canonicalPath;
        return extractContentMetadata(sourcePath, entry.content || '').canonicalPath;
    }

    updateCopyLink(sourcePath) {
        const button = this.container.querySelector('.academic-copy-link');
        if (!button) return;
        button.style.display = sourcePath ? '' : 'none';
    }

    copyCurrentLink(control) {
        const canonicalPath = this.canonicalPathFor(this.currentArticle);
        const url = buildShareUrl({
            canonicalPath,
            mode: 'academic',
            origin: window.location.origin,
            basePath: import.meta.env.BASE_URL
        });
        copyShareUrl(url, control);
    }

    openInUnifiedViewer(path, newTab = false) {
        const basePath = import.meta.env.BASE_URL;
        const entry = this.fs.get(path) || {};
        const publication = extractContentMetadata(path, entry.content || '');
        const canonicalPath = entry.canonicalPath || publication.canonicalPath;
        const readerUrl = `${basePath}reader.html?path=${encodeURIComponent(path)}`;
        const targetUrl = import.meta.env.DEV
            ? readerUrl
            : sitePathToHref(canonicalPath, basePath);

        if (newTab) {
            window.open(targetUrl, '_blank');
        } else {
            window.location.href = targetUrl;
        }
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        document.body.classList.add('academic-mode-active');
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        document.body.classList.remove('academic-mode-active');
    }
    
    destroy() {
        // Cleanup all components
        if (this.fileTree) this.fileTree.destroy();
        if (this.contentLoader) this.contentLoader.destroy();
    }
}
