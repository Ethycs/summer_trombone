/**
 * Academic Mode View - A file browser and article list that redirects to unified viewer
 * Reuses FileTreeWidget and TerminalContentLoader components
 */

import { FileTreeWidget } from './FileTreeWidget.js';
import { TerminalContentLoader } from './TerminalContentLoader.js';

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
                    <h1>Summer Trombone: AI Research and Development</h1>
                    <div class="academic-controls">
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
        const self = this;
        const originalRender = this.contentLoader.render.bind(this.contentLoader);
        
        // Add renderAcademicPost method to contentLoader
        this.contentLoader.renderAcademicPost = function(post) {
            const formattedDate = this.formatDate(post.date);
            const typeLabel = post.type === 'paper' ? '[PAPER]' : '[POST]';
            const typeClass = post.type === 'paper' ? 'paper' : 'post';
            
            return `
                <article class="terminal-post academic-post ${typeClass}" data-path="${post.path}">
                    <header class="post-header">
                        <span class="post-type">${typeLabel}</span>
                        <h2 class="post-title">${post.title}</h2>
                        <time class="post-date" datetime="${post.date}">${formattedDate}</time>
                    </header>
                    <div class="post-summary">
                        <p>${post.summary}</p>
                    </div>
                    <footer class="post-footer">
                        <a href="#" class="continue-reading" data-path="${post.path}">
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
            this.openInUnifiedViewer(event.detail.path);
        });
        
        // Middle-click handling for new tab
        this.container.addEventListener('mousedown', (event) => {
            if (event.button === 1) { // Middle button
                const link = event.target.closest('.continue-reading, .tree-node.file');
                if (link) {
                    event.preventDefault();
                    const path = link.dataset.path;
                    this.openInUnifiedViewer(path, true);
                }
            }
        });
    }
    
    attachGlobalListeners() {
        // Global event listeners can be added here if needed
    }
    
    openInUnifiedViewer(path, newTab = false) {
        // Navigate to the reader page with the article path
        const readerUrl = `/reader.html?path=${encodeURIComponent(path)}`;
        
        if (newTab) {
            window.open(readerUrl, '_blank');
        } else {
            window.location.href = readerUrl;
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