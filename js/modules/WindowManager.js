/**
 * Window Manager - Handles window dragging, resizing, and state management
 */
export class WindowManager {
    constructor() {
        this.windows = [];
        this.activeWindow = null;
        this.dragState = {
            isDragging: false,
            currentX: 0,
            currentY: 0,
            initialX: 0,
            initialY: 0,
            xOffset: 0,
            yOffset: 0
        };
    }

    init() {
        this.setupWindows();
        this.setupEventListeners();
    }

    setupWindows() {
        this.windows = Array.from(document.querySelectorAll('.window'));
        this.windows.forEach(window => {
            this.initializeWindow(window);
        });
    }

    initializeWindow(windowElement) {
        const header = windowElement.querySelector('.window-header');
        if (!header) return;

        // Store initial position
        const rect = windowElement.getBoundingClientRect();
        windowElement.dataset.initialX = rect.left;
        windowElement.dataset.initialY = rect.top;

        // Setup dragging
        header.addEventListener('mousedown', (e) => this.startDrag(e, windowElement));
        
        // Setup window controls
        this.setupWindowControls(windowElement);
    }

    setupWindowControls(windowElement) {
        const controls = windowElement.querySelectorAll('.window-button');
        
        controls.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWindowControl(button.textContent, windowElement);
            });
        });
    }

    handleWindowControl(action, windowElement) {
        switch (action) {
            case '×':
                this.closeWindow(windowElement);
                break;
            case '_':
                this.minimizeWindow(windowElement);
                break;
            case '□':
                this.maximizeWindow(windowElement);
                break;
        }
    }

    closeWindow(windowElement) {
        windowElement.style.display = 'none';
        this.updateTaskbar(windowElement, false);
    }

    minimizeWindow(windowElement) {
        const isMinimized = windowElement.style.visibility === 'hidden';
        windowElement.style.visibility = isMinimized ? 'visible' : 'hidden';
        this.updateTaskbar(windowElement, isMinimized);
    }

    maximizeWindow(windowElement) {
        windowElement.classList.toggle('maximized');
        
        if (windowElement.classList.contains('maximized')) {
            // Store current position and size
            const rect = windowElement.getBoundingClientRect();
            windowElement.dataset.restoreX = rect.left;
            windowElement.dataset.restoreY = rect.top;
            windowElement.dataset.restoreWidth = rect.width;
            windowElement.dataset.restoreHeight = rect.height;
        } else {
            // Restore position and size
            if (windowElement.dataset.restoreX) {
                windowElement.style.left = windowElement.dataset.restoreX + 'px';
                windowElement.style.top = windowElement.dataset.restoreY + 'px';
                windowElement.style.width = windowElement.dataset.restoreWidth + 'px';
                windowElement.style.height = windowElement.dataset.restoreHeight + 'px';
            }
        }
    }

    startDrag(e, windowElement) {
        if (e.target.classList.contains('window-button')) return;
        
        this.activeWindow = windowElement;
        this.dragState.isDragging = true;
        
        // Bring window to front
        this.bringToFront(windowElement);
        
        // Store the current window position (accounting for any existing left/top styles)
        const computedStyle = window.getComputedStyle(windowElement);
        const currentLeft = parseInt(computedStyle.left) || 0;
        const currentTop = parseInt(computedStyle.top) || 0;
        
        // Store initial mouse position and window position
        this.dragState.initialX = e.clientX;
        this.dragState.initialY = e.clientY;
        this.dragState.xOffset = currentLeft;
        this.dragState.yOffset = currentTop;
        
        // Add dragging class
        windowElement.classList.add('dragging');
        
        // Prevent text selection
        document.body.style.userSelect = 'none';
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Handle window focus
        document.addEventListener('mousedown', (e) => {
            const window = e.target.closest('.window');
            if (window) {
                this.bringToFront(window);
            }
        });
    }

    handleDrag(e) {
        if (!this.dragState.isDragging || !this.activeWindow) return;
        
        e.preventDefault();
        
        // Calculate new position based on mouse movement from initial position
        const deltaX = e.clientX - this.dragState.initialX;
        const deltaY = e.clientY - this.dragState.initialY;
        
        // Calculate final position
        this.dragState.currentX = this.dragState.xOffset + deltaX;
        this.dragState.currentY = this.dragState.yOffset + deltaY;
        
        // Apply constraints (keep window on screen)
        const windowRect = this.activeWindow.getBoundingClientRect();
        const maxX = window.innerWidth - 100; // Keep at least 100px visible
        const maxY = window.innerHeight - 50;  // Keep at least 50px visible
        
        this.dragState.currentX = Math.max(-windowRect.width + 100, 
                                  Math.min(maxX, this.dragState.currentX));
        this.dragState.currentY = Math.max(0, 
                                  Math.min(maxY, this.dragState.currentY));
        
        // Apply position directly (no transform)
        this.activeWindow.style.left = this.dragState.currentX + 'px';
        this.activeWindow.style.top = this.dragState.currentY + 'px';
    }

    endDrag() {
        if (!this.dragState.isDragging) return;
        
        this.dragState.isDragging = false;
        
        if (this.activeWindow) {
            // Remove dragging class
            this.activeWindow.classList.remove('dragging');
            
            // No need to handle transforms since we're using direct positioning
            // Position is already set in handleDrag()
        }
        
        // Restore text selection
        document.body.style.userSelect = '';
        this.activeWindow = null;
    }

    bringToFront(windowElement) {
        // Reset all windows to base z-index
        this.windows.forEach(win => {
            win.style.zIndex = '';
        });
        
        // Bring selected window to front
        windowElement.style.zIndex = '20';
        this.activeWindow = windowElement;
    }

    updateTaskbar(windowElement, isVisible) {
        // Find corresponding taskbar item and update its state
        const windowTitle = windowElement.querySelector('.window-title')?.textContent;
        if (!windowTitle) return;
        
        const taskbarItems = document.querySelectorAll('.taskbar-item');
        taskbarItems.forEach(item => {
            if (item.textContent.toLowerCase().includes(windowTitle.toLowerCase().split('@')[0])) {
                if (isVisible) {
                    item.classList.remove('minimized');
                } else {
                    item.classList.add('minimized');
                }
            }
        });
    }

    // Public methods for external control
    showWindow(windowSelector) {
        const window = document.querySelector(windowSelector);
        if (window) {
            window.style.display = 'block';
            window.style.visibility = 'visible';
            this.bringToFront(window);
            this.updateTaskbar(window, true);
        }
    }

    hideWindow(windowSelector) {
        const window = document.querySelector(windowSelector);
        if (window) {
            this.minimizeWindow(window);
        }
    }

    toggleWindow(windowSelector) {
        const window = document.querySelector(windowSelector);
        if (window) {
            const isVisible = window.style.visibility !== 'hidden' && 
                            window.style.display !== 'none';
            
            if (isVisible) {
                this.hideWindow(windowSelector);
            } else {
                this.showWindow(windowSelector);
            }
        }
    }

    // Mobile-specific methods
    setupMobileMode() {
        if (window.innerWidth <= 768) {
            // Disable dragging on mobile
            this.windows.forEach(window => {
                const header = window.querySelector('.window-header');
                if (header) {
                    header.style.cursor = 'default';
                }
            });
        }
    }

    // Utility methods
    getWindowByTitle(title) {
        return this.windows.find(window => {
            const windowTitle = window.querySelector('.window-title')?.textContent;
            return windowTitle && windowTitle.toLowerCase().includes(title.toLowerCase());
        });
    }

    getAllWindows() {
        return this.windows;
    }

    getActiveWindow() {
        return this.activeWindow;
    }
}
