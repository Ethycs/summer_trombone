/**
 * Terminal Effects - Handles CRT effects, animations, and terminal-specific behaviors
 */
export class TerminalEffects {
    constructor() {
        this.flickerInterval = null;
        this.cursorInterval = null;
        this.clockInterval = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupClock();
        this.setupCursorBlink();
        this.setupRandomFlicker();
        this.setupTerminalEffects();
        
        this.isInitialized = true;
    }

    setupClock() {
        const clockElement = document.getElementById('clock');
        if (!clockElement) return;

        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toUTCString().split(' ')[4] + ' UTC';
            clockElement.textContent = timeStr;
        };

        // Update immediately and then every second
        updateClock();
        this.clockInterval = setInterval(updateClock, 1000);
    }

    setupCursorBlink() {
        const cursors = document.querySelectorAll('.cursor');
        if (cursors.length === 0) return;

        this.cursorInterval = setInterval(() => {
            cursors.forEach(cursor => {
                cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
            });
        }, 500);
    }

    setupRandomFlicker() {
        this.flickerInterval = setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance every interval
                this.triggerFlicker();
            }
        }, 1000);
    }

    triggerFlicker() {
        const body = document.body;
        const originalAnimation = body.style.animation;
        
        body.style.animation = 'flicker 0.1s ease-in-out';
        
        setTimeout(() => {
            body.style.animation = originalAnimation || 'flicker 0.15s infinite alternate';
        }, 100);
    }

    setupTerminalEffects() {
        // Add typing effect to specific elements
        this.addTypingEffect();
        
        // Setup glow effects on hover
        this.setupGlowEffects();
        
        // Setup scan line effects
        this.setupScanlines();
    }

    addTypingEffect() {
        const typeElements = document.querySelectorAll('[data-type]');
        
        typeElements.forEach(element => {
            const text = element.textContent;
            const speed = parseInt(element.dataset.typeSpeed) || 50;
            
            element.textContent = '';
            element.style.borderRight = '2px solid var(--terminal-green)';
            
            this.typeText(element, text, speed);
        });
    }

    typeText(element, text, speed) {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
                // Remove cursor after typing is complete
                setTimeout(() => {
                    element.style.borderRight = 'none';
                }, 500);
            }
        }, speed);
    }

    setupGlowEffects() {
        // Add glow effect to interactive elements
        const interactiveElements = document.querySelectorAll(
            '.window-button, .taskbar-item, .article-item, a'
        );

        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                this.addGlow(element);
            });

            element.addEventListener('mouseleave', () => {
                this.removeGlow(element);
            });
        });
    }

    addGlow(element) {
        const currentShadow = getComputedStyle(element).textShadow;
        if (!currentShadow.includes('0px 0px 8px')) {
            element.style.textShadow = currentShadow + ', 0 0 8px var(--terminal-green)';
        }
    }

    removeGlow(element) {
        const currentShadow = getComputedStyle(element).textShadow;
        element.style.textShadow = currentShadow.replace(', 0px 0px 8px var(--terminal-green)', '');
    }

    setupScanlines() {
        // Scanlines are handled by CSS, but we can control their intensity
        const scanlineElement = document.querySelector('body::before');
        
        // Add dynamic scanline intensity based on activity
        document.addEventListener('mousemove', () => {
            this.intensifyScanlines();
        });

        document.addEventListener('click', () => {
            this.intensifyScanlines();
        });
    }

    intensifyScanlines() {
        const body = document.body;
        body.style.setProperty('--scanline-color', 'rgba(0, 255, 102, 0.06)');
        
        setTimeout(() => {
            body.style.setProperty('--scanline-color', 'rgba(0, 255, 102, 0.03)');
        }, 200);
    }

    // Matrix rain effect (optional)
    createMatrixRain() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        canvas.style.opacity = '0.1';
        
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        const charArray = chars.split('');
        
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = [];
        
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }
        
        const draw = () => {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.04)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#00ff66';
            ctx.font = fontSize + 'px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };
        
        setInterval(draw, 35);
        
        // Resize handler
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
        
        return canvas;
    }

    // Boot sequence effect
    playBootSequence() {
        const bootMessages = [
            'Initializing neural pathways...',
            'Loading consciousness matrix...',
            'Establishing connection to Wintermute...',
            'Calibrating sensory input...',
            'Boot sequence complete.',
            'Welcome to the matrix.'
        ];

        const bootContainer = document.createElement('div');
        bootContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--terminal-bg);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: var(--font-stack);
            color: var(--terminal-green);
        `;

        document.body.appendChild(bootContainer);

        let messageIndex = 0;
        const showNextMessage = () => {
            if (messageIndex < bootMessages.length) {
                const messageElement = document.createElement('div');
                messageElement.textContent = bootMessages[messageIndex];
                messageElement.style.cssText = `
                    margin: 10px 0;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                `;
                
                bootContainer.appendChild(messageElement);
                
                setTimeout(() => {
                    messageElement.style.opacity = '1';
                }, 100);
                
                messageIndex++;
                setTimeout(showNextMessage, 1000);
            } else {
                // Boot complete, fade out
                setTimeout(() => {
                    bootContainer.style.opacity = '0';
                    bootContainer.style.transition = 'opacity 1s ease';
                    
                    setTimeout(() => {
                        document.body.removeChild(bootContainer);
                    }, 1000);
                }, 1000);
            }
        };

        showNextMessage();
    }

    // Glitch effect
    triggerGlitch(element, duration = 200) {
        const originalText = element.textContent;
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const glitchInterval = setInterval(() => {
            let glitchedText = '';
            for (let i = 0; i < originalText.length; i++) {
                if (Math.random() < 0.1) {
                    glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                } else {
                    glitchedText += originalText[i];
                }
            }
            element.textContent = glitchedText;
        }, 50);
        
        setTimeout(() => {
            clearInterval(glitchInterval);
            element.textContent = originalText;
        }, duration);
    }

    /**
     * Triggers a specific glitch effect based on filesystem events.
     * @param {string} event - The type of event ('file-added', 'file-removed', 'file-change').
     */
    trigger(event) {
        const glitchProfiles = {
            'file-added': 'glitch-materialize',
            'file-removed': 'glitch-disintegrate',
            'file-change': 'glitch-flux'
        };

        const effectClass = glitchProfiles[event];
        if (!effectClass) return;

        const target = document.body;
        target.classList.add(effectClass);

        setTimeout(() => {
            target.classList.remove(effectClass);
        }, 500); // Duration of the effect
    }

    // Cleanup methods
    destroy() {
        if (this.flickerInterval) {
            clearInterval(this.flickerInterval);
        }
        
        if (this.cursorInterval) {
            clearInterval(this.cursorInterval);
        }
        
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        
        this.isInitialized = false;
    }

    // Utility methods
    setFlickerIntensity(intensity) {
        const body = document.body;
        if (intensity === 0) {
            body.style.animation = 'none';
        } else {
            body.style.animation = `flicker ${0.15 / intensity}s infinite alternate`;
        }
    }

    setScanlineIntensity(intensity) {
        const body = document.body;
        const alpha = Math.max(0, Math.min(0.1, intensity));
        body.style.setProperty('--scanline-color', `rgba(0, 255, 102, ${alpha})`);
    }
}
