/**
 * ThemeSwitcher.js - Manages the 'Hacker' and 'Academic' view modes.
 */
export class ThemeSwitcher {
    constructor() {
        this.toggleButton = document.getElementById('mode-toggle');
        this.currentMode = 'hacker'; // or 'academic'
    }

    init() {
        if (!this.toggleButton) {
            console.error('ThemeSwitcher FATAL: Could not find #mode-toggle button. Feature disabled.');
            return;
        }

        this.toggleButton.addEventListener('click', () => this.toggleMode());

        // Sync with the blocking script in <head>
        const isAcademic = document.documentElement.classList.contains('academic-mode');
        this.setMode(isAcademic ? 'academic' : 'hacker');
    }

    toggleMode() {
        const newMode = this.currentMode === 'hacker' ? 'academic' : 'hacker';
        this.setMode(newMode);
    }

    setMode(mode) {
        this.currentMode = mode;
        localStorage.setItem('themeMode', mode);

        // The class on <html> prevents FOUC, the class on <body> applies the styles
        if (mode === 'academic') {
            document.documentElement.classList.add('academic-mode');
            document.body.classList.add('academic-mode');
        } else {
            document.documentElement.classList.remove('academic-mode');
            document.body.classList.remove('academic-mode');
        }
    }
}
