/**
 * FileSystemSync.js
 *
 * Manages the virtual filesystem, providing real-time updates for both
 * development (Vite HMR) and production (GitHub Pages polling).
 */
class FileSystemSync {
    constructor() {
        this.filesystem = new Map();
        this.watchers = new Set();
        this.isDev = import.meta.env.DEV;

        if (this.isDev) {
            this.setupHotReload();
        } else {
            this.setupProductionSync();
        }

        // Initial scan
        this.scanFilesystem();
    }

    // --- Public API ---

    watch(callback) {
        this.watchers.add(callback);
        // Return an unsubscribe function
        return () => this.watchers.delete(callback);
    }

    get(path) {
        return this.filesystem.get(path);
    }

    list(directory) {
        const entries = [];
        for (const [path, content] of this.filesystem.entries()) {
            if (path.startsWith(directory)) {
                entries.push({ path, content });
            }
        }
        return entries;
    }

    getAllFilesAsObject() {
        const files = {};
        for (const [path, data] of this.filesystem.entries()) {
            const filename = path.split('/').pop();
            files[path] = {
                path,
                filename,
                title: data.title || filename.replace(/\.(md|tex)$/, '').replace(/_/g, ' '),
                ...data
            };
        }
        return { files };
    }

    // --- Internal Methods ---

    async scanFilesystem() {
        if (this.isDev) {
            await this.scanWithViteGlob();
        } else {
            await this.scanWithManifest();
        }
        this.notifyWatchers('scan-complete');
    }

    async scanWithViteGlob() {
        // 1. Fetch metadata from filesystem.json
        let metadata = {};
        try {
            const manifestJson = await import('/system/filesystem.json?raw');
            const manifest = JSON.parse(manifestJson.default);
            metadata = Object.values(manifest.files).reduce((acc, file) => {
                acc[file.path] = file;
                return acc;
            }, {});
        } catch (error) {
            console.warn('[FileSystemSync] Could not load metadata from filesystem.json', error);
        }

        // 2. Scan files with Vite glob
        const files = {
            posts: import.meta.glob('/blog/posts/**/*.md', { eager: true, query: '?raw', import: 'default' }),
            papers: import.meta.glob('/blog/papers/**/*.tex', { eager: true, query: '?raw', import: 'default' }),
            drafts: import.meta.glob('/blog/drafts/**/*.{md,tex}', { eager: true, query: '?raw', import: 'default' })
        };

        this.filesystem.clear();
        Object.values(files).forEach(items => {
            Object.entries(items).forEach(([path, content]) => {
                const meta = metadata[path] || {};
                this.addFile(path, {
                    content,
                    created: meta.created || null,
                    modified: meta.modified || null,
                    summary: meta.summary || null,
                    title: meta.title || null,
                    type: meta.type || null
                });
            });
        });
        
        console.log('[FileSystemSync] Total files loaded:', this.filesystem.size);
    }

    async scanWithManifest() {
        try {
            const basePath = import.meta.env.BASE_URL;
            console.log('[FileSystemSync] Loading manifest from:', basePath + 'system/filesystem.json');
            const response = await fetch(basePath + 'system/filesystem.json?t=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to fetch filesystem manifest');
            const manifest = await response.json();

            console.log('[FileSystemSync] Manifest loaded, files:', Object.keys(manifest.files).length);
            this.filesystem.clear();
            for (const file of Object.values(manifest.files)) {
                this.addFile(file.path, {
                    content: null,
                    created: file.created,
                    modified: file.modified,
                    summary: file.summary,
                    title: file.title,
                    type: file.type
                });
            }
            console.log('[FileSystemSync] Production scan complete, total files:', this.filesystem.size);
        } catch (error) {
            console.error('[FileSystemSync] Error loading production manifest:', error);
        }
    }

    setupHotReload() {
        if (!import.meta.hot) return;

        import.meta.hot.on('file-added', (path) => this.handleFileAdded(path));
        import.meta.hot.on('file-removed', (path) => this.handleFileRemoved(path));
        import.meta.hot.on('file-change', (path) => this.handleFileChange(path));
        // Note: Rename is harder to track, often seen as remove + add
    }

    setupProductionSync() {
        this.pollingInterval = setInterval(async () => {
            await this.checkForUpdates();
        }, 30000); // Poll every 30 seconds
    }

    async checkForUpdates() {
        try {
            const basePath = import.meta.env.BASE_URL;
            const response = await fetch(basePath + 'system/filesystem.json?t=' + new Date().getTime());
            if (!response.ok) return;
            const manifest = await response.json();
            const newFiles = new Set(manifest.files);
            const oldFiles = new Set(this.filesystem.keys());

            // Find added files
            for (const file of newFiles) {
                if (!oldFiles.has(file)) {
                    this.handleFileAdded(file);
                }
            }

            // Find removed files
            for (const file of oldFiles) {
                if (!newFiles.has(file)) {
                    this.handleFileRemoved(file);
                }
            }
        } catch (error) {
            console.error('[FileSystemSync] Error polling for updates:', error);
        }
    }

    addFile(path, data) {
        this.filesystem.set(path, data);
    }

    removeFile(path) {
        this.filesystem.delete(path);
    }

    async fetchAndAddFile(path) {
        try {
            const content = await this.fetchFileContent(path);
            this.addFile(path, { content, created: new Date().toISOString(), modified: new Date().toISOString() });
            this.notifyWatchers('file-added', path);
        } catch (error) {
            console.error(`[FileSystemSync] Failed to fetch and add file: ${path}`, error);
        }
    }

    async fetchAndUpdateFile(path) {
        try {
            const content = await this.fetchFileContent(path);
            const existing = this.filesystem.get(path) || {};
            this.addFile(path, { ...existing, content, modified: new Date().toISOString() });
            this.notifyWatchers('file-change', path);
        } catch (error) {
            console.error(`[FileSystemSync] Failed to fetch and update file: ${path}`, error);
        }
    }

    async fetchFileContent(path) {
        // Handle base path for GitHub Pages - import.meta.env.BASE_URL includes trailing slash
        const basePath = import.meta.env.BASE_URL;
        const fullPath = basePath + path.replace(/^\//, '');
        const response = await fetch(fullPath + '?t=' + new Date().getTime());
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.text();
    }

    handleFileAdded(path) {
        if (this.isDev) {
            // In dev, content comes from HMR reload, so we just need to rescan
            this.scanFilesystem().then(() => {
                this.notifyWatchers('file-added', path);
            });
        } else {
            this.fetchAndAddFile(path);
        }
    }

    handleFileRemoved(path) {
        this.removeFile(path);
        this.notifyWatchers('file-removed', path);
    }

    handleFileChange(path) {
        if (this.isDev) {
            this.scanFilesystem().then(() => {
                this.notifyWatchers('file-change', path);
            });
        } else {
            this.fetchAndUpdateFile(path);
        }
    }

    notifyWatchers(event, data) {
        console.log(`[FileSystemSync] Notifying watchers: ${event}`, data || '');
        for (const watcher of this.watchers) {
            try {
                watcher(event, data);
            } catch (error) {
                console.error('[FileSystemSync] Error in watcher callback:', error);
            }
        }
    }

    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.watchers.clear();
    }
}

export { FileSystemSync };
