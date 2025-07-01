/**
 * Academic Mode View - A unified reading interface combining file browser and article viewer
 * Reuses FileTreeWidget and TerminalContentLoader components in a static layout
 */

import { FileTreeWidget } from './FileTreeWidget.js';
import { TerminalContentLoader } from './TerminalContentLoader.js';
import { MarkdownArticleSystem } from './MarkdownArticleSystem.js';
import { TexPaperSystem } from './TexPaperSystem.js';

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
                    <h1>Academic Reading Mode</h1>
                    <div class="academic-controls">
                    </div>
                </div>
                
                <div class="academic-body">
                    <div class="academic-top-section">
                        <div class="academic-file-browser">
                            <h2>File Explorer</h2>
                            <div id="academic-file-tree"></div>
                        </div>
                        
                        <div class="academic-content-list">
                            <h2>Recent Articles</h2>
                            <div id="academic-content-loader"></div>
                        </div>
                    </div>
                    
                    <div class="academic-bottom-section">
                        <div class="academic-article-viewer">
                            <div class="article-viewer-header">
                                <span class="article-title">Select an article to read</span>
                                <div class="article-controls">
                                    <button class="btn-font-decrease" title="Decrease font size">A-</button>
                                    <button class="btn-font-increase" title="Increase font size">A+</button>
                                    <button class="btn-print" title="Print article">🖨️</button>
                                    <button class="btn-new-window" title="Open in new window">⧉</button>
                                </div>
                            </div>
                            <div id="academic-article-content">
                                <div class="article-placeholder">
                                    <p>Click on any article from the file browser or recent articles list to begin reading.</p>
                                    <p class="hint">Middle-click to open in a new window.</p>
                                </div>
                            </div>
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
        
        // Create proper container structure for article viewers
        const articleContent = this.container.querySelector('#academic-article-content');
        
        // Create a wrapper that has the expected structure
        const viewerWrapper = document.createElement('div');
        viewerWrapper.innerHTML = `
            <div class="article-list" style="display: none;"></div>
            <div class="article-content"></div>
        `;
        
        // Initialize viewers with the wrapper
        this.markdownViewer = new MarkdownArticleSystem(viewerWrapper, this.terminalEffects, this.fs);
        this.texViewer = new TexPaperSystem(viewerWrapper, this.terminalEffects, this.fs);
        
        // Initialize the viewers
        await this.markdownViewer.init();
        await this.texViewer.init();
        
        // Store reference to the actual content area
        this.articleContentArea = viewerWrapper.querySelector('.article-content');
        
        // Attach event listeners for file opening
        this.attachComponentListeners();
    }
    
    createAcademicContentRenderer() {
        const originalRender = this.contentLoader.render.bind(this.contentLoader);
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
            this.loadArticle(event.detail.path);
        });
        
        // Middle-click handling
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Middle button
                const link = event.target.closest('.continue-reading, .tree-node.file');
                if (link) {
                    event.preventDefault();
                    const path = link.dataset.path;
                    this.openInNewWindow(path);
                }
            }
        });
        
        // Font size controls
        this.container.querySelector('.btn-font-decrease').addEventListener('click', () => {
            this.adjustFontSize(-1);
        });
        
        this.container.querySelector('.btn-font-increase').addEventListener('click', () => {
            this.adjustFontSize(1);
        });
        
        // Print button
        this.container.querySelector('.btn-print').addEventListener('click', () => {
            this.printArticle();
        });
        
        // New window button
        this.container.querySelector('.btn-new-window').addEventListener('click', () => {
            if (this.currentArticle) {
                this.openInNewWindow(this.currentArticle);
            }
        });
    }
    
    attachGlobalListeners() {
        // Global event listeners can be added here if needed
    }
    
    async loadArticle(path) {
        this.currentArticle = path;
        const filename = path.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        
        // Update header
        const titleElement = this.container.querySelector('.article-title');
        titleElement.textContent = filename.replace(/\.(md|tex)$/, '').replace(/[_-]/g, ' ');
        
        const contentContainer = this.container.querySelector('#academic-article-content');
        contentContainer.innerHTML = '<div class="loading">Loading article...</div>';
        
        try {
            if (ext === 'md') {
                await this.markdownViewer.loadArticle(filename);
                // Copy the rendered content to our container
                contentContainer.innerHTML = this.articleContentArea.innerHTML;
            } else if (ext === 'tex') {
                await this.texViewer.loadArticle(filename);
                // Copy the rendered content to our container
                contentContainer.innerHTML = this.articleContentArea.innerHTML;
            } else {
                contentContainer.innerHTML = '<div class="error">Unsupported file type</div>';
            }
        } catch (error) {
            console.error('Failed to load article:', error);
            contentContainer.innerHTML = '<div class="error">Failed to load article</div>';
        }
    }
    
    openInNewWindow(path) {
        // Create a new browser window with just the article
        const newWindow = window.open('', '_blank', 'width=800,height=600,menubar=yes,toolbar=yes,scrollbars=yes');
        
        if (newWindow) {
            // Clone the academic CSS into the new window
            const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                .map(link => link.outerHTML)
                .join('\n');
            
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${path.split('/').pop()}</title>
                    ${styles}
                    <style>
                        body { 
                            background: var(--academic-bg); 
                            color: var(--academic-text);
                            padding: 2rem;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body class="academic-mode">
                    <div id="article-content">Loading...</div>
                </body>
                </html>
            `);
            
            // Load the article in the new window
            // This would need the actual article loading logic
            newWindow.document.getElementById('article-content').innerHTML = 
                this.container.querySelector('#academic-article-content').innerHTML;
        }
    }
    
    adjustFontSize(delta) {
        const articleContent = this.container.querySelector('#academic-article-content');
        const currentSize = parseInt(window.getComputedStyle(articleContent).fontSize);
        const newSize = Math.max(12, Math.min(24, currentSize + delta));
        articleContent.style.fontSize = newSize + 'px';
    }
    
    printArticle() {
        window.print();
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
        if (this.markdownViewer && this.markdownViewer.destroy) this.markdownViewer.destroy();
        if (this.texViewer && this.texViewer.destroy) this.texViewer.destroy();
    }
}