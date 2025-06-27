/**
 * Mobile Handler - Manages mobile-specific interactions and responsive behavior
 */
export class MobileHandler {
    constructor(windowManager) {
        this.windowManager = windowManager;
        this.isMobile = false;
        this.taskbarItems = [];
        this.windows = {};
        this.activeSection = null;
    }

    init() {
        this.detectMobile();
        this.setupTaskbarNavigation();
        this.setupScrollHandling();
        this.setupOrientationHandling();
        this.setupTouchEnhancements();
    }

    detectMobile() {
        this.isMobile = window.innerWidth <= 768;
        
        if (this.isMobile) {
            this.enableMobileMode();
        }
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    this.enableMobileMode();
                } else {
                    this.disableMobileMode();
                }
            }
        });
    }

    enableMobileMode() {
        document.body.classList.add('mobile-mode');
        
        // Disable window dragging
        if (this.windowManager) {
            this.windowManager.setupMobileMode();
        }
        
        // Setup mobile-specific styles
        this.applyMobileStyles();
    }

    disableMobileMode() {
        document.body.classList.remove('mobile-mode');
        
        // Re-enable desktop functionality
        if (this.windowManager) {
            this.windowManager.init();
        }
    }

    applyMobileStyles() {
        const desktop = document.querySelector('.desktop');
        if (desktop) {
            desktop.style.display = 'block';
            desktop.style.padding = '0';
        }
        
        // Ensure windows are in mobile layout
        const windows = document.querySelectorAll('.window');
        windows.forEach(window => {
            window.style.position = 'relative';
            window.style.width = '100%';
            window.style.height = 'auto';
            window.style.transform = 'none';
            window.style.top = 'auto';
            window.style.left = 'auto';
            window.style.right = 'auto';
            window.style.bottom = 'auto';
        });
    }

    setupTaskbarNavigation() {
        this.taskbarItems = Array.from(document.querySelectorAll('.taskbar-item'));
        this.windows = {
            'Terminal': '.main-window',
            'SysMonitor': '.system-window',
            'Editor': '.code-window',
            'Logs': '.log-window',
            'Articles': '.articles-window',
            'Blog': '.markdown-blog-window'
        };

        this.taskbarItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (this.isMobile) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleMobileNavigation(item);
                } else {
                    // Desktop behavior - let WindowManager handle it
                    this.handleDesktopNavigation(item);
                }
            });
        });
    }

    handleDesktopNavigation(clickedItem) {
        const windowSelector = this.windows[clickedItem.textContent];
        if (!windowSelector) return;

        // Use WindowManager to show/hide windows
        if (this.windowManager) {
            this.windowManager.toggleWindow(windowSelector);
        }

        // Update active state
        this.updateActiveTaskbarItem(clickedItem);
    }

    handleMobileNavigation(clickedItem) {
        const windowSelector = this.windows[clickedItem.textContent];
        if (!windowSelector) return;

        const targetWindow = document.querySelector(windowSelector);
        if (!targetWindow) return;

        // Smooth scroll to the target window
        targetWindow.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Update active state
        this.updateActiveTaskbarItem(clickedItem);

        // Flash the window header for visual feedback
        this.flashWindowHeader(targetWindow);
    }

    updateActiveTaskbarItem(activeItem) {
        this.taskbarItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    flashWindowHeader(windowElement) {
        const header = windowElement.querySelector('.window-header');
        if (!header) return;

        header.classList.add('flash');
        
        setTimeout(() => {
            header.classList.remove('flash');
        }, 300);
    }

    setupScrollHandling() {
        if (!this.isMobile) return;

        let scrollTimeout;
        
        const updateActiveSection = () => {
            const scrollPosition = window.scrollY + 100; // Offset for header
            let activeSection = null;

            Object.values(this.windows).forEach(selector => {
                const element = document.querySelector(selector);
                if (element && scrollPosition >= element.offsetTop) {
                    activeSection = selector;
                }
            });

            if (activeSection && activeSection !== this.activeSection) {
                this.activeSection = activeSection;
                this.updateTaskbarFromScroll(activeSection);
            }
        };

        // Throttled scroll listener
        window.addEventListener('scroll', () => {
            if (!this.isMobile) return;
            
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            scrollTimeout = setTimeout(updateActiveSection, 50);
        });
    }

    updateTaskbarFromScroll(activeWindowSelector) {
        // Find the taskbar item that corresponds to the active window
        const activeWindowName = Object.keys(this.windows).find(
            key => this.windows[key] === activeWindowSelector
        );

        if (activeWindowName) {
            const activeItem = this.taskbarItems.find(
                item => item.textContent === activeWindowName
            );

            if (activeItem) {
                this.updateActiveTaskbarItem(activeItem);
            }
        }
    }

    setupOrientationHandling() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculate dimensions after orientation change
                this.detectMobile();
                
                // Scroll to maintain current position
                if (this.activeSection) {
                    const element = document.querySelector(this.activeSection);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 100);
        });
    }

    setupTouchEnhancements() {
        if (!this.isMobile) return;

        // Improve touch targets
        const touchTargets = document.querySelectorAll(
            '.window-button, .taskbar-item, .article-item, a'
        );

        touchTargets.forEach(target => {
            target.style.touchAction = 'manipulation';
            
            // Add touch feedback
            target.addEventListener('touchstart', () => {
                target.style.backgroundColor = 'rgba(0, 255, 102, 0.2)';
            });

            target.addEventListener('touchend', () => {
                setTimeout(() => {
                    target.style.backgroundColor = '';
                }, 150);
            });
        });

        // Prevent zoom on double tap for specific elements
        const preventZoomElements = document.querySelectorAll(
            '.window-header, .taskbar, .article-browser'
        );

        preventZoomElements.forEach(element => {
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
            });
        });
    }

    // Swipe gesture handling
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            this.handleSwipe(startX, startY, endX, endY);
        });
    }

    handleSwipe(startX, startY, endX, endY) {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;

        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                this.swipeRight();
            } else {
                this.swipeLeft();
            }
        }
        // Vertical swipe
        else if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0) {
                this.swipeDown();
            } else {
                this.swipeUp();
            }
        }
    }

    swipeLeft() {
        // Navigate to next window
        this.navigateToNextWindow();
    }

    swipeRight() {
        // Navigate to previous window
        this.navigateToPreviousWindow();
    }

    swipeUp() {
        // Could be used for additional functionality
    }

    swipeDown() {
        // Could be used for additional functionality
    }

    navigateToNextWindow() {
        const currentIndex = this.getCurrentWindowIndex();
        const nextIndex = (currentIndex + 1) % this.taskbarItems.length;
        
        if (this.taskbarItems[nextIndex]) {
            this.handleMobileNavigation(this.taskbarItems[nextIndex]);
        }
    }

    navigateToPreviousWindow() {
        const currentIndex = this.getCurrentWindowIndex();
        const prevIndex = currentIndex === 0 ? this.taskbarItems.length - 1 : currentIndex - 1;
        
        if (this.taskbarItems[prevIndex]) {
            this.handleMobileNavigation(this.taskbarItems[prevIndex]);
        }
    }

    getCurrentWindowIndex() {
        const activeItem = this.taskbarItems.find(item => item.classList.contains('active'));
        return activeItem ? this.taskbarItems.indexOf(activeItem) : 0;
    }

    // Utility methods
    isMobileDevice() {
        return this.isMobile;
    }

    getCurrentActiveWindow() {
        return this.activeSection;
    }

    scrollToWindow(windowName) {
        const windowSelector = this.windows[windowName];
        if (windowSelector) {
            const element = document.querySelector(windowSelector);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    // Haptic feedback (if supported)
    triggerHapticFeedback(type = 'light') {
        if ('vibrate' in navigator) {
            switch (type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate(50);
                    break;
            }
        }
    }
}
