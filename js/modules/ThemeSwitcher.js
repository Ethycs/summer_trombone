/**
 * ThemeSwitcher.js - Manages the 'Hacker' and 'Academic' view modes.
 */
import { AcademicModeView } from './AcademicModeView.js';

export class ThemeSwitcher {
    constructor(fileSystemSync, terminalEffects) {
        this.toggleButton = document.getElementById('mode-toggle');
        this.currentMode = 'hacker'; // or 'academic'
        this.fileSystemSync = fileSystemSync;
        this.terminalEffects = terminalEffects;
        this.academicView = null;
    }

    init() {
        if (!this.toggleButton) {
            console.error('ThemeSwitcher FATAL: Could not find #mode-toggle button. Feature disabled.');
            return;
        }

        this.toggleButton.addEventListener('click', () => this.toggleMode());

        // Sync internal state with what was already set by the blocking script
        const isAcademic = document.documentElement.classList.contains('academic-mode');
        this.currentMode = isAcademic ? 'academic' : 'hacker';
        
        // Initialize academic view container
        const academicContainer = document.getElementById('academic-view');
        if (academicContainer && this.fileSystemSync) {
            this.academicView = new AcademicModeView(academicContainer, this.fileSystemSync, this.terminalEffects);
        }
        
        // Show academic view if starting in academic mode
        if (isAcademic && this.academicView) {
            this.academicView.show();
        }
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
            
            // Show academic view instead of just hiding elements
            if (this.academicView) {
                this.academicView.show();
            }
        } else {
            document.documentElement.classList.remove('academic-mode');
            document.body.classList.remove('academic-mode');
            
            // Hide academic view
            if (this.academicView) {
                this.academicView.hide();
            }
        }
    }
}
