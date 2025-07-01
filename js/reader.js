/**
 * Reader Application - Standalone article reader with academic styling
 */

import { FileSystemSync } from './modules/FileSystemSync.js';
import { MarkdownArticleSystem } from './modules/MarkdownArticleSystem.js';
import { TexPaperSystem } from './modules/TexPaperSystem.js';

class ReaderApp {
    constructor() {
        this.fs = new FileSystemSync();
        this.contentElement = document.getElementById('reader-content');
        this.titleElement = document.getElementById('article-title');
        this.articlePath = null;
        
        // Create a mock container for the article systems
        this.mockContainer = document.createElement('div');
        this.mockContainer.innerHTML = `
            <div class="article-list" style="display: none;"></div>
            <div class="article-content"></div>
        `;
        
        this.markdownSystem = new MarkdownArticleSystem(this.mockContainer, null, this.fs);
        this.texSystem = new TexPaperSystem(this.mockContainer, null, this.fs);
        
        this.articleContentArea = this.mockContainer.querySelector('.article-content');
    }
    
    async init() {
        // Get article path from URL
        const params = new URLSearchParams(window.location.search);
        this.articlePath = params.get('path');
        
        if (!this.articlePath) {
            this.showError('No article path provided');
            return;
        }
        
        // Initialize the article systems
        await this.markdownSystem.init();
        await this.texSystem.init();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Wait for filesystem to be ready
        await this.waitForFilesystem();
        
        // Load the article
        await this.loadArticle();
    }
    
    async waitForFilesystem() {
        // Wait for the filesystem to complete its initial scan
        return new Promise((resolve) => {
            if (this.fs.filesystem.size > 0) {
                resolve();
                return;
            }
            
            const unsubscribe = this.fs.watch((event) => {
                if (event === 'scan-complete' && this.fs.filesystem.size > 0) {
                    unsubscribe();
                    resolve();
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                unsubscribe();
                resolve();
            }, 5000);
        });
    }
    
    setupEventListeners() {
        // Font size controls
        document.querySelector('.btn-font-decrease').addEventListener('click', () => {
            this.adjustFontSize(-1);
        });
        
        document.querySelector('.btn-font-increase').addEventListener('click', () => {
            this.adjustFontSize(1);
        });
        
        // Print button
        document.querySelector('.btn-print').addEventListener('click', () => {
            window.print();
        });
        
        // Update back button to maintain academic mode
        const backButton = document.querySelector('.reader-back-button');
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Go back to main page in academic mode
            window.location.href = '/?mode=academic';
        });
    }
    
    async loadArticle() {
        try {
            const filename = this.articlePath.split('/').pop();
            const ext = filename.split('.').pop().toLowerCase();
            
            // Update title
            this.titleElement.textContent = filename.replace(/\.(md|tex)$/, '').replace(/[_-]/g, ' ');
            
            if (ext === 'md') {
                await this.markdownSystem.loadArticle(filename);
            } else if (ext === 'tex') {
                await this.texSystem.loadArticle(filename);
            } else {
                throw new Error('Unsupported file type');
            }
            
            // Copy the rendered content
            this.contentElement.innerHTML = this.articleContentArea.innerHTML;
            
            // Apply academic styles to content
            this.applyAcademicStyles();
            
        } catch (error) {
            console.error('Failed to load article:', error);
            this.showError(`Failed to load article: ${error.message}`);
        }
    }
    
    applyAcademicStyles() {
        // Ensure content uses academic styling
        const elements = this.contentElement.querySelectorAll('*');
        elements.forEach(el => {
            // Remove any terminal-specific classes
            el.classList.remove('terminal-text', 'terminal-green', 'terminal-bright');
        });
    }
    
    adjustFontSize(delta) {
        const currentSize = parseInt(window.getComputedStyle(this.contentElement).fontSize);
        const newSize = Math.max(12, Math.min(24, currentSize + delta));
        this.contentElement.style.fontSize = newSize + 'px';
    }
    
    showError(message) {
        this.contentElement.innerHTML = `<div class="reader-error">${message}</div>`;
    }
}

// Initialize the reader app
document.addEventListener('DOMContentLoaded', async () => {
    const app = new ReaderApp();
    await app.init();
});