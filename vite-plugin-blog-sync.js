/**
 * vite-plugin-blog-sync.js
 *
 * A Vite plugin to watch for filesystem changes in content directories
 * and notify the client via WebSocket for HMR.
 */
export function blogSyncPlugin() {
    return {
        name: 'blog-sync',

        configureServer(server) {
            const watcher = server.watcher;

            const sendEvent = (event, path) => {
                // Normalize path to be web-friendly (forward slashes)
                const normalizedPath = path.replace(/\\/g, '/');
                
                // Ensure path is relative to the project root
                const rootRelativePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;

                server.ws.send({
                    type: 'custom',
                    event: event,
                    data: rootRelativePath
                });
            };

            watcher.on('add', (path) => {
                if (path.match(/\.(md|tex)$/)) {
                    sendEvent('file-added', path);
                }
            });

            watcher.on('unlink', (path) => {
                if (path.match(/\.(md|tex)$/)) {
                    sendEvent('file-removed', path);
                }
            });

            watcher.on('change', (path) => {
                if (path.match(/\.(md|tex)$/)) {
                    sendEvent('file-change', path);
                }
            });
        },

        // This handles the initial change event for HMR, but our watcher is more specific.
        // We can still use it as a fallback.
        handleHotUpdate({ file, server }) {
            if (file.endsWith('.md') || file.endsWith('.tex')) {
                server.ws.send({
                    type: 'custom',
                    event: 'file-change',
                    data: `/${file}` // Assuming file is relative to root
                });
            }
        }
    };
}
