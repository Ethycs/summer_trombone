/**
 * Window Manager - Handles window dragging, resizing, and state management
 * Now with hardware-accelerated dragging for performance.
 */
export class WindowManager {
    constructor(debug = false) {
        this.windows = [];
        this.activeWindow = null;
        this.dragState = {
            isDragging: false,
            // Store the original top/left values at the start of a drag
            initialX: 0,
            initialY: 0,
            // Store the mouse position at the start of a drag
            startX: 0,
            startY: 0,
            // For requestAnimationFrame
            animationFrameId: null,
            lastX: 0,
            lastY: 0,
        };
        this.debug = debug;
        if (this.debug) console.log('WindowManager: Initialized in debug mode.');
    }

    init() {
        try {
            this.setupWindows();
            this.setupEventListeners();
            if (this.debug) console.log('WindowManager: Initialization complete.');
        } catch (error) {
            console.error('WindowManager: Critical error during init.', error);
        }
    }

    setupWindows() {
        this.windows = Array.from(document.querySelectorAll('.window'));
        this.windows.forEach(window => {
            this.initializeWindow(window);
        });
    }

    initializeWindow(windowElement) {
        const header = windowElement.querySelector('.window-header');
        if (!header) {
            console.warn('WindowManager: Window found without a header. Skipping.', windowElement);
            return;
        }
        header.addEventListener('mousedown', (e) => this.startDrag(e, windowElement));
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
        if (this.debug) console.log(`WindowManager: Handling control action "${action}" for`, windowElement);
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
    }

    showWindow(windowElement) {
        windowElement.style.display = 'block';
        windowElement.style.visibility = 'visible';
        this.bringToFront(windowElement);
        this.updateTaskbar(windowElement, true);
    }

    toggleWindow(windowSelector) {
        const windowElement = document.querySelector(windowSelector);
        if (!windowElement) {
            if (this.debug) console.warn(`WindowManager: Window with selector "${windowSelector}" not found.`);
            return;
        }

        const isVisible = windowElement.style.display !== 'none' && windowElement.style.visibility !== 'hidden';

        if (isVisible) {
            this.closeWindow(windowElement);
        } else {
            this.showWindow(windowElement);
        }
    }

    startDrag(e, windowElement) {
        try {
            if (e.target.classList.contains('window-button')) return;
            
            if (this.debug) console.log('WindowManager: Starting drag for', windowElement);
            this.activeWindow = windowElement;
            this.dragState.isDragging = true;
            
            this.bringToFront(windowElement);
            
            const computedStyle = window.getComputedStyle(windowElement);
            this.dragState.initialX = parseInt(computedStyle.left) || 0;
            this.dragState.initialY = parseInt(computedStyle.top) || 0;
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
            
            windowElement.classList.add('dragging');
            document.body.style.userSelect = 'none';
        } catch (error) {
            console.error('WindowManager: Error during startDrag.', error);
            this.endDrag();
        }
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        document.addEventListener('mousedown', (e) => {
            const window = e.target.closest('.window');
            if (window) {
                this.bringToFront(window);
            }
        });
    }

    handleDrag(e) {
        if (!this.dragState.isDragging) return;

        this.dragState.lastX = e.clientX;
        this.dragState.lastY = e.clientY;

        if (!this.dragState.animationFrameId) {
            this.dragState.animationFrameId = requestAnimationFrame(() => this.updateDragPosition());
        }
    }

    updateDragPosition() {
        if (!this.dragState.isDragging || !this.activeWindow) return;

        const deltaX = this.dragState.lastX - this.dragState.startX;
        const deltaY = this.dragState.lastY - this.dragState.startY;

        this.activeWindow.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
        
        // Allow the next frame to be requested
        this.dragState.animationFrameId = null;
    }

    endDrag() {
        if (!this.dragState.isDragging || !this.activeWindow) return;

        // Cancel any pending animation frame
        if (this.dragState.animationFrameId) {
            cancelAnimationFrame(this.dragState.animationFrameId);
            this.dragState.animationFrameId = null;
        }

        if (this.debug) console.log('WindowManager: Ending drag for', this.activeWindow);
        
        const deltaX = this.dragState.lastX - this.dragState.startX;
        const deltaY = this.dragState.lastY - this.dragState.startY;

        // "Bake in" the new position by updating top/left
        const newX = this.dragState.initialX + deltaX;
        const newY = this.dragState.initialY + deltaY;
        this.activeWindow.style.left = newX + 'px';
        this.activeWindow.style.top = newY + 'px';

        // Reset the transform so the next drag starts from a clean state
        this.activeWindow.style.transform = '';

        this.activeWindow.classList.remove('dragging');
        document.body.style.userSelect = '';
        
        this.dragState.isDragging = false;
        this.activeWindow = null;
    }

    bringToFront(windowElement) {
        if (!windowElement) return;
        if (this.debug) console.log('WindowManager: Bringing to front', windowElement);

        this.windows.forEach(win => {
            win.style.zIndex = '';
        });
        
        windowElement.style.zIndex = '20';
        this.activeWindow = windowElement;
    }

    updateTaskbar(windowElement, isVisible) {
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

    setupMobileMode() {
        // Disable dragging for mobile mode
        this.windows.forEach(window => {
            const header = window.querySelector('.window-header');
            if (header) {
                header.style.cursor = 'default';
            }
        });
        
        // Remove any existing drag event listeners
        this.dragState.isDragging = false;
        this.activeWindow = null;
        
        if (this.debug) console.log('WindowManager: Mobile mode enabled');
    }
}
