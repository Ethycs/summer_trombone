/**
 * File Tree Widget - Interactive file browser for the blog
 */

import { FileSystemSync } from './FileSystemSync.js';

export class FileTreeWidget {
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error('FileTreeWidget requires a container element');
        }
        
        this.container = containerElement;
        this.fs = new FileSystemSync();
        this.expanded = new Set(['/blog', '/blog/posts', '/blog/papers']);
        this.currentPath = '/blog';
        
        // Subscribe to filesystem changes
        this.unsubscribe = this.fs.watch((event, data) => {
            this.handleFilesystemChange(event, data);
        });
        
        this.init();
    }
    
    async init() {
        this.attachListeners();
    }
    
    async render() {
        const tree = await this.buildTree();
        
        this.container.classList.add('file-tree-widget');
        this.container.innerHTML = `
            <div class="tree-header">
                <span class="current-path">${this.currentPath}</span>
                <div class="tree-header-columns">
                    <span class="tree-date">Created</span>
                    <span class="tree-date">Modified</span>
                </div>
            </div>
            <div class="tree-content">
                ${this.renderTree(tree, '/blog')}
            </div>
        `;
    }
    
    async buildTree() {
        // Build tree structure from filesystem
        const tree = {
            name: 'blog',
            type: 'directory',
            children: {
                posts: {
                    name: 'posts',
                    type: 'directory',
                    children: {}
                },
                papers: {
                    name: 'papers',
                    type: 'directory',
                    children: {}
                },
                drafts: {
                    name: 'drafts',
                    type: 'directory',
                    children: {}
                }
            }
        };
        
        // Get all files from FileSystemSync
        const posts = this.fs.list('/blog/posts/');
        const papers = this.fs.list('/blog/papers/');
        const drafts = this.fs.list('/blog/drafts/');
        
        // Add posts
        posts.forEach(entry => {
            const filename = entry.path.split('/').pop();
            tree.children.posts.children[filename] = {
                name: filename,
                type: 'file',
                path: entry.path,
                created: entry.content.created,
                modified: entry.content.modified
            };
        });
        
        // Add papers
        papers.forEach(entry => {
            const filename = entry.path.split('/').pop();
            tree.children.papers.children[filename] = {
                name: filename,
                type: 'file',
                path: entry.path,
                created: entry.content.created,
                modified: entry.content.modified
            };
        });
        
        // Add drafts
        drafts.forEach(entry => {
            const filename = entry.path.split('/').pop();
            tree.children.drafts.children[filename] = {
                name: filename,
                type: 'file',
                path: entry.path,
                created: entry.content.created,
                modified: entry.content.modified
            };
        });
        
        return tree;
    }
    
    renderTree(node, path, level = 0) {
        if (!node) return '';
        
        const indent = '  '.repeat(level);
        let html = '';
        
        if (node.type === 'directory') {
            const isExpanded = this.expanded.has(path);
            const arrow = isExpanded ? '▼' : '▶';
            const hasChildren = node.children && Object.keys(node.children).length > 0;
            
            html += `
                <div class="tree-node directory ${hasChildren ? 'has-children' : 'empty'}" 
                     data-path="${path}" 
                     data-type="dir"
                     style="padding-left: ${level * 20}px">
                    <span class="tree-arrow">${hasChildren ? arrow : ' '}</span>
                    <span class="tree-icon">[DIR]</span>
                    <span class="tree-name">${node.name}/</span>
                    <span class="tree-date"></span>
                    <span class="tree-date"></span>
                </div>
            `;
            
            if (isExpanded && node.children) {
                for (const [name, child] of Object.entries(node.children)) {
                    html += this.renderTree(child, `${path}/${name}`, level + 1);
                }
            }
        } else {
            // Determine file type and icon
            const ext = path.split('.').pop();
            const icon = {
                'md': '[MD]',
                'tex': '[TEX]',
                'txt': '[TXT]'
            }[ext] || '[FILE]';
            
            const created = node.created ? new Date(node.created).toLocaleDateString() : 'N/A';
            const modified = node.modified ? new Date(node.modified).toLocaleDateString() : 'N/A';

            html += `
                <div class="tree-node file" 
                     data-path="${path}" 
                     data-type="file"
                     style="padding-left: ${level * 20}px">
                    <span class="tree-arrow"> </span>
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${node.name}</span>
                    <span class="tree-date">${created}</span>
                    <span class="tree-date">${modified}</span>
                </div>
            `;
        }
        
        return html;
    }
    
    attachListeners() {
        this.container.addEventListener('click', (e) => {
            const node = e.target.closest('.tree-node');
            if (!node) return;
            
            const path = node.dataset.path;
            const type = node.dataset.type;
            
            if (type === 'dir') {
                // Toggle expansion
                if (this.expanded.has(path)) {
                    this.expanded.delete(path);
                } else {
                    this.expanded.add(path);
                }
                this.render();
            } else {
                // Open file
                this.openFile(path);
            }
        });
        
        // Hover effects
        this.container.addEventListener('mouseover', (e) => {
            const node = e.target.closest('.tree-node');
            if (node) {
                node.classList.add('hover');
            }
        });
        
        this.container.addEventListener('mouseout', (e) => {
            const node = e.target.closest('.tree-node');
            if (node) {
                node.classList.remove('hover');
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
        const node = this.container.querySelector(`[data-path="${path}"]`);
        if (node) {
            node.classList.add('opening');
            setTimeout(() => node.classList.remove('opening'), 300);
        }
    }
    
    async handleFilesystemChange(event, data) {
        console.log(`[FileTreeWidget] Filesystem change: ${event}`, data);
        
        // Refresh tree
        await this.render();

        // Show notification
        this.showNotification(event, data);
    }
    
    showNotification(event, data) {
        if (event === 'scan-complete') return; // Don't show notification for initial scan

        const notifications = {
            'file-added': (path) => `[+] New file: ${path.split('/').pop()}`,
            'file-removed': (path) => `[-] Removed: ${path.split('/').pop()}`,
            'file-change': (path) => `[*] Modified: ${path.split('/').pop()}`
        };
        
        if (notifications[event]) {
            const message = typeof data === 'string' ? notifications[event](data) : notifications[event]();
            const notif = document.createElement('div');
            notif.className = 'tree-notification';
            notif.textContent = message;
            
            this.container.querySelector('.tree-header').appendChild(notif);
            
            setTimeout(() => notif.remove(), 3000);
        }
    }
    
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
