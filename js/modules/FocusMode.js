/**
 * FocusMode.js - Presents a single document as one fullscreen terminal window.
 *
 * Entered when the app boots from a share link (the static /terminal/ carrier
 * page, or the ?doc= alias). Every other window and the taskbar are hidden by
 * css/components/focus-mode.css; the window keeps its terminal title bar.
 */
import { sitePathToHref } from './contentMetadata.js';

export class FocusMode {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.focusedWindow = null;
        this.document = null;
    }

    isActive() {
        return document.body.classList.contains('focus-mode');
    }

    enter(windowElement, documentInfo = {}) {
        if (!windowElement) return false;

        this.focusedWindow = windowElement;
        this.document = documentInfo;

        document.body.classList.add('focus-mode');
        windowElement.classList.add('focused-doc');
        this.windowManager?.showWindow(windowElement);

        return true;
    }

    exit() {
        if (!this.isActive()) return false;

        document.body.classList.remove('focus-mode');
        this.focusedWindow?.classList.remove('focused-doc');
        this.focusedWindow = null;
        this.document = null;
        this.restoreDesktopUrl();

        return true;
    }

    /**
     * Leaving focus mode drops us on the desktop, so the address bar should say
     * so - whether we arrived via /articles/<slug>/terminal/ or ?doc=.
     */
    restoreDesktopUrl() {
        if (typeof history?.replaceState !== 'function') return;

        const root = sitePathToHref('/', import.meta.env.BASE_URL);
        if (window.location.pathname + window.location.search === root) return;

        try {
            history.replaceState(null, '', root);
        } catch (error) {
            console.warn('[FocusMode] Could not rewrite the URL:', error);
        }
    }

    /**
     * Browsers arriving via the ?doc= alias land on the homepage's markup, so
     * point the title and canonical link at the document they are actually
     * reading. The static /terminal/ pages ship correct tags already and pass
     * `skip` so this is a no-op for them.
     */
    applyDocumentSeo({ title, canonicalPath, skip = false } = {}) {
        if (skip || !title) return;

        document.title = `${title} | Summer Trombone`;

        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && canonicalPath) {
            canonical.href = new URL(
                sitePathToHref(canonicalPath, import.meta.env.BASE_URL),
                window.location.origin
            ).toString();
        }
    }
}
