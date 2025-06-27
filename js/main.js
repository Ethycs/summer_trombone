/**
 * Main Application Entry Point
 * Initializes all modules and manages the terminal interface
 */

import { TexArticleSystem } from './modules/TexArticleSystem.js';
import { WindowManager } from './modules/WindowManager.js';
import { TerminalEffects } from './modules/TerminalEffects.js';
import { MobileHandler } from './modules/MobileHandler.js';

class TerminalApp {
    constructor() {
        this.modules = {};
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize modules in order
            await this.initializeModules();
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('Terminal application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize terminal application:', error);
        }
    }

    async initializeModules() {
        // Initialize Window Manager first, in debug mode
        this.modules.windowManager = new WindowManager(false);
        this.modules.windowManager.init();

        // Initialize Terminal Effects
        this.modules.terminalEffects = new TerminalEffects();
        this.modules.terminalEffects.init();

        // Initialize Mobile Handler with window manager reference
        this.modules.mobileHandler = new MobileHandler(this.modules.windowManager);
        this.modules.mobileHandler.init();

        // Initialize TeX Article System
        this.modules.texSystem = new TexArticleSystem();
        await this.modules.texSystem.init();

        console.log('All modules initialized');
    }

    setupGlobalEvents() {
        // Handle visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHidden();
            } else {
                this.onAppVisible();
            }
        });

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.onWindowResize();
            }, 250);
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Handle errors
        window.addEventListener('error', (e) => {
            this.handleError(e);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError(e);
        });
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + key combinations
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    event.preventDefault();
                    this.switchToWindow(parseInt(event.key) - 1);
                    break;
                
                case 'f':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                
                case 'm':
                    event.preventDefault();
                    this.toggleMatrixRain();
                    break;
                
                case 'r':
                    event.preventDefault();
                    this.refreshCurrentWindow();
                    break;
            }
        }

        // Function keys
        switch (event.key) {
            case 'F11':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            
            case 'Escape':
                this.handleEscape();
                break;
        }
    }

    switchToWindow(index) {
        const taskbarItems = document.querySelectorAll('.taskbar-item');
        if (taskbarItems[index]) {
            taskbarItems[index].click();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    toggleMatrixRain() {
        if (this.modules.terminalEffects) {
            if (!this.matrixCanvas) {
                this.matrixCanvas = this.modules.terminalEffects.createMatrixRain();
            } else {
                this.matrixCanvas.remove();
                this.matrixCanvas = null;
            }
        }
    }

    refreshCurrentWindow() {
        if (this.modules.mobileHandler && this.modules.mobileHandler.isMobileDevice()) {
            // On mobile, refresh the current section
            const activeWindow = this.modules.mobileHandler.getCurrentActiveWindow();
            if (activeWindow) {
                const element = document.querySelector(activeWindow);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } else {
            // On desktop, refresh the active window
            const activeWindow = this.modules.windowManager?.getActiveWindow();
            if (activeWindow) {
                this.modules.windowManager.bringToFront(activeWindow);
            }
        }
    }

    handleEscape() {
        // Close any open modals or return to normal state
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    onAppHidden() {
        // Reduce animations when tab is not visible
        if (this.modules.terminalEffects) {
            this.modules.terminalEffects.setFlickerIntensity(0);
        }
    }

    onAppVisible() {
        // Restore animations when tab becomes visible
        if (this.modules.terminalEffects) {
            this.modules.terminalEffects.setFlickerIntensity(1);
        }
    }

    onWindowResize() {
        // Handle responsive changes
        if (this.modules.mobileHandler) {
            this.modules.mobileHandler.detectMobile();
        }

        // Update matrix rain canvas if active
        if (this.matrixCanvas) {
            this.matrixCanvas.width = window.innerWidth;
            this.matrixCanvas.height = window.innerHeight;
        }
    }

    handleError(error) {
        console.error('Application error:', error);
        
        // Show user-friendly error message
        this.showErrorMessage('An error occurred. Please refresh the page if problems persist.');
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 12px;
            background: rgba(255, 102, 102, 0.1);
            border: 1px solid #ff6666;
            color: #ff6666;
            font-family: var(--font-stack);
            font-size: 12px;
            border-radius: 4px;
        `;

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);

        // Allow manual dismissal
        errorDiv.addEventListener('click', () => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        });
    }

    // Public API methods
    getModule(name) {
        return this.modules[name];
    }

    getAllModules() {
        return this.modules;
    }

    isReady() {
        return this.isInitialized;
    }

    // Cleanup method
    destroy() {
        // Cleanup all modules
        Object.values(this.modules).forEach(module => {
            if (module.destroy && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Remove matrix canvas if active
        if (this.matrixCanvas) {
            this.matrixCanvas.remove();
        }

        this.isInitialized = false;
        console.log('Terminal application destroyed');
    }
}

// Create global app instance
const app = new TerminalApp();

// Initialize the application
app.init();

// Expose app to global scope for debugging
window.terminalApp = app;

// Export for module usage
export default app;
