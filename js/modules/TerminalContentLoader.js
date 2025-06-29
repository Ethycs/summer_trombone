/**
 * Terminal Content Loader - Renders article summaries in terminal window
 */

import { FileSystemSync } from './FileSystemSync.js';

export class TerminalContentLoader {
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error('TerminalContentLoader requires a container element');
        }
        
        this.container = containerElement;
        this.fs = new FileSystemSync();
        this.posts = [];
        this.postsPerPage = 5;
        this.currentPage = 0;
        this.metadata = {};
        
        // Subscribe to filesystem changes
        this.unsubscribe = this.fs.watch((event, data) => {
            this.handleFilesystemChange(event, data);
        });
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        try {
            await this.loadMetadata();
            await this.loadContent();
            this.attachListeners();
            this.render();
        } catch (error) {
            console.error('[TerminalContentLoader] Error during initialization:', error);
            this.showError('Failed to load content. Please refresh the page.');
        }
    }
    
    showLoading() {
        this.container.classList.add('terminal-content-loader');
        this.container.innerHTML = `
            <div class="terminal-loading">
                <p class="loading-message">Loading posts...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="terminal-error">
                <p class="error-message">[ERROR] ${message}</p>
            </div>
        `;
    }
    
    async loadMetadata() {
        try {
            // Load metadata from filesystem.json
            const isDev = import.meta.env.DEV;
            if (isDev) {
                const manifestJson = await import('/system/filesystem.json?raw');
                const manifest = JSON.parse(manifestJson.default);
                this.metadata = Object.values(manifest.files).reduce((acc, file) => {
                    acc[file.path] = file;
                    return acc;
                }, {});
            } else {
                const response = await fetch('/filesystem.json?t=' + new Date().getTime());
                const manifest = await response.json();
                this.metadata = Object.values(manifest.files).reduce((acc, file) => {
                    acc[file.path] = file;
                    return acc;
                }, {});
            }
        } catch (error) {
            console.warn('[TerminalContentLoader] Could not load metadata from filesystem.json', error);
            this.metadata = {};
        }
    }
    
    async loadContent() {
        // Get all posts and papers from filesystem
        const allFiles = this.fs.list('/blog/');
        
        // Filter and map files with metadata
        this.posts = allFiles
            .filter(entry => {
                const path = entry.path;
                return path.includes('/posts/') || path.includes('/papers/');
            })
            .map(entry => {
                const { path, content } = entry;
                const filename = path.split('/').pop();
                const type = path.includes('/posts/') ? 'post' : 'paper';
                const ext = filename.split('.').pop();
                
                // Get metadata from filesystem.json if available
                const metadata = this.metadata[path] || {};
                
                return {
                    path,
                    filename,
                    type,
                    ext,
                    title: metadata?.title || this.extractTitleFromFilename(filename),
                    date: metadata?.modified || content.modified,
                    created: metadata?.created || content.created,
                    summary: metadata?.summary || this.generateDefaultSummary(type, filename),
                    content: content.content
                };
            })
            .sort((a, b) => {
                // Sort by modified date, newest first
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });
    }
    
    
    extractTitleFromFilename(filename) {
        // Remove extension and replace underscores/hyphens with spaces
        return filename
            .replace(/\.(md|tex|txt)$/, '')
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    generateDefaultSummary(type, filename) {
        if (type === 'paper') {
            return 'Academic paper exploring advanced concepts in AI safety and alignment.';
        }
        return 'Thoughts on technology, AI, and the future of computing.';
    }
    
    render() {
        this.container.classList.add('terminal-content-loader');
        
        if (this.posts.length === 0) {
            this.container.innerHTML = this.renderEmptyState();
            return;
        }
        
        const startIdx = this.currentPage * this.postsPerPage;
        const endIdx = startIdx + this.postsPerPage;
        const pagePosts = this.posts.slice(startIdx, endIdx);
        
        this.container.innerHTML = `
            <div class="terminal-posts">
                ${pagePosts.map(post => this.renderPost(post)).join('')}
            </div>
            ${this.renderPagination()}
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="terminal-empty">
                <p class="empty-message">No posts found in /blog/posts/ or /blog/papers/</p>
                <p class="empty-hint">Posts will appear here once they are added to the filesystem.</p>
            </div>
        `;
    }
    
    renderPost(post) {
        const formattedDate = this.formatDate(post.date);
        const typeLabel = post.type === 'paper' ? '[PAPER]' : '[POST]';
        const typeClass = post.type === 'paper' ? 'paper' : 'post';
        
        return `
            <article class="terminal-post ${typeClass}" data-path="${post.path}">
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
    }
    
    renderPagination() {
        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        if (totalPages <= 1) return '';
        
        const prevDisabled = this.currentPage === 0 ? 'disabled' : '';
        const nextDisabled = this.currentPage >= totalPages - 1 ? 'disabled' : '';
        
        return `
            <nav class="terminal-pagination">
                <button class="page-prev" ${prevDisabled}>← Previous</button>
                <span class="page-info">Page ${this.currentPage + 1} of ${totalPages}</span>
                <button class="page-next" ${nextDisabled}>Next →</button>
            </nav>
        `;
    }
    
    formatDate(dateStr) {
        if (!dateStr) return 'Unknown date';
        
        const date = new Date(dateStr);
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        return date.toLocaleDateString('en-US', options);
    }
    
    attachListeners() {
        this.container.addEventListener('click', (e) => {
            // Handle "Continue reading" clicks
            if (e.target.classList.contains('continue-reading')) {
                e.preventDefault();
                const path = e.target.dataset.path;
                this.openFile(path);
            }
            
            // Handle pagination
            if (e.target.classList.contains('page-prev')) {
                this.previousPage();
            } else if (e.target.classList.contains('page-next')) {
                this.nextPage();
            }
        });
        
        // Hover effects
        this.container.addEventListener('mouseover', (e) => {
            const post = e.target.closest('.terminal-post');
            if (post) {
                post.classList.add('hover');
            }
        });
        
        this.container.addEventListener('mouseout', (e) => {
            const post = e.target.closest('.terminal-post');
            if (post) {
                post.classList.remove('hover');
            }
        });
    }
    
    openFile(path) {
        // Dispatch custom event for file opening
        const event = new CustomEvent('file-open', {
            detail: { path },
            bubbles: true
        });
        this.container.dispatchEvent(event);
        
        // Visual feedback
        const post = this.container.querySelector(`[data-path="${path}"]`);
        if (post) {
            post.classList.add('opening');
            setTimeout(() => post.classList.remove('opening'), 300);
        }
    }
    
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.render();
            this.scrollToTop();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        if (this.currentPage < totalPages - 1) {
            this.currentPage++;
            this.render();
            this.scrollToTop();
        }
    }
    
    scrollToTop() {
        // Scroll container to top when changing pages
        const postsContainer = this.container.querySelector('.terminal-posts');
        if (postsContainer) {
            postsContainer.scrollTop = 0;
        }
    }
    
    async handleFilesystemChange(event, data) {
        console.log(`[TerminalContentLoader] Filesystem change: ${event}`, data);
        
        // Reload content on relevant changes
        if (event === 'file-added' || event === 'file-removed' || event === 'file-change') {
            await this.loadMetadata();
            await this.loadContent();
            this.render();
            this.showNotification(event, data);
        }
    }
    
    showNotification(event, data) {
        if (event === 'scan-complete') return; // Don't show notification for initial scan
        
        const notifications = {
            'file-added': (path) => `[+] New article: ${path.split('/').pop()}`,
            'file-removed': (path) => `[-] Removed: ${path.split('/').pop()}`,
            'file-change': (path) => `[*] Updated: ${path.split('/').pop()}`
        };
        
        if (notifications[event]) {
            const message = typeof data === 'string' ? notifications[event](data) : notifications[event]();
            const notif = document.createElement('div');
            notif.className = 'terminal-notification';
            notif.textContent = message;
            
            // Add notification to the top of the container
            this.container.insertBefore(notif, this.container.firstChild);
            
            setTimeout(() => notif.remove(), 3000);
        }
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}