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
        const files = {
            posts: import.meta.glob('/posts/**/*.md', { eager: true, query: '?raw', import: 'default' }),
            papers: import.meta.glob('/papers/**/*.tex', { eager: true, query: '?raw', import: 'default' }),
            drafts: import.meta.glob('/drafts/**/*.{md,tex}', { eager: true, query: '?raw', import: 'default' })
        };

        console.log('[FileSystemSync] Scanning with Vite glob patterns');
        console.log('[FileSystemSync] Posts found:', Object.keys(files.posts));
        console.log('[FileSystemSync] Papers found:', Object.keys(files.papers));
        console.log('[FileSystemSync] Drafts found:', Object.keys(files.drafts));

        this.filesystem.clear();
        Object.values(files).forEach(items => {
            Object.entries(items).forEach(([path, content]) => {
                this.addFile(path, content);
            });
        });
        
        console.log('[FileSystemSync] Total files loaded:', this.filesystem.size);
        console.log('[FileSystemSync] Files in filesystem:', Array.from(this.filesystem.keys()));
    }

    async scanWithManifest() {
        try {
            const response = await fetch('/filesystem.json?t=' + new Date().getTime());
            if (!response.ok) throw new Error('Failed to fetch filesystem manifest');
            const manifest = await response.json();

            this.filesystem.clear();
            for (const path of manifest.files) {
                // We don't have content initially in production, just paths
                this.addFile(path, null);
            }
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
            const response = await fetch('/filesystem.json?t=' + new Date().getTime());
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

    addFile(path, content) {
        this.filesystem.set(path, content);
    }

    removeFile(path) {
        this.filesystem.delete(path);
    }

    async fetchAndAddFile(path) {
        try {
            const content = await this.fetchFileContent(path);
            this.addFile(path, content);
            this.notifyWatchers('file-added', path);
        } catch (error) {
            console.error(`[FileSystemSync] Failed to fetch and add file: ${path}`, error);
        }
    }

    async fetchAndUpdateFile(path) {
        try {
            const content = await this.fetchFileContent(path);
            this.addFile(path, content);
            this.notifyWatchers('file-change', path);
        } catch (error) {
            console.error(`[FileSystemSync] Failed to fetch and update file: ${path}`, error);
        }
    }

    async fetchFileContent(path) {
        const response = await fetch(path + '?t=' + new Date().getTime());
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
