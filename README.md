# SummerTrombone Terminal - Modular Architecture

A cyberpunk-themed terminal blog interface with integrated KaTeX support for rendering LaTeX articles from `.tex` files.

## Project Structure

```
summer_trombone/
├── index.html              # Main HTML file (modular version)
├── summer_trombone.html     # Original monolithic version
├── README.md               # This file
├── css/                    # Modular CSS architecture
│   ├── main.css            # Main CSS file (imports all modules)
│   ├── variables.css       # CSS custom properties and theme variables
│   ├── responsive.css      # Mobile and responsive styles
│   ├── base/               # Base styles and foundations
│   │   ├── reset.css       # CSS reset, fonts, and base styles
│   │   └── animations.css  # CRT effects, animations, and transitions
│   └── components/         # Component-specific styles
│       ├── windows.css     # Window system styling
│       ├── terminal.css    # Terminal content and text styling
│       ├── articles.css    # Article viewer and KaTeX styling
│       └── taskbar.css     # Taskbar and navigation styling
├── js/                     # Modular JavaScript architecture
│   ├── main.js             # Main application entry point
│   ├── modules/            # Feature modules
│   │   ├── TexArticleSystem.js  # LaTeX article loading and rendering
│   │   ├── WindowManager.js     # Window dragging, resizing, controls
│   │   ├── TerminalEffects.js   # CRT effects, animations, clock
│   │   └── MobileHandler.js     # Mobile responsiveness and touch
│   └── utils/              # Utility functions (future expansion)
└── article/                # LaTeX articles directory
    └── premium_for_that.tex # Sample academic paper
```

## Features

### Core Functionality
- **Cyberpunk Terminal Interface**: Retro CRT effects with green phosphor styling
- **Window Management**: Draggable, resizable windows with minimize/maximize/close
- **KaTeX Integration**: Full LaTeX math rendering support
- **TeX Article System**: Automatic loading and parsing of `.tex` files
- **Mobile Responsive**: Adaptive layout for mobile devices

### Modular Architecture Benefits
- **Maintainability**: Each component has its own file
- **Reusability**: Components can be easily modified or extended
- **Performance**: Better caching and selective loading
- **Collaboration**: Multiple developers can work on different modules
- **Testing**: Individual modules can be tested in isolation

## CSS Architecture

### Variables System (`css/variables.css`)
Centralized theme management with CSS custom properties:
- Color scheme (terminal green, backgrounds, etc.)
- Typography (font stacks, sizes, line heights)
- Spacing scale (consistent margins and padding)
- Animation timings and effects
- Z-index scale for layering

### Component-Based Styling
Each UI component has its own CSS file:
- **Windows**: Draggable window system with headers and controls
- **Terminal**: Text styling, prompts, code blocks, and content
- **Articles**: Academic paper styling with KaTeX integration
- **Taskbar**: Navigation and system status display

### Responsive Design
Mobile-first approach with:
- Breakpoint-based media queries
- Touch-friendly interface adaptations
- Partition-style mobile layout
- Optimized typography scaling

## JavaScript Architecture

### Module System
ES6 modules with clear separation of concerns:

#### `TexArticleSystem.js`
- Automatic `.tex` file discovery
- LaTeX parsing and HTML conversion
- KaTeX math rendering
- Academic document structure support

#### `WindowManager.js`
- Window dragging and positioning
- Resize and state management
- Z-index and focus handling
- Window controls (minimize/maximize/close)

#### `TerminalEffects.js`
- CRT flicker and scanline effects
- Clock and cursor animations
- Matrix rain effect (optional)
- Boot sequence animations

#### `MobileHandler.js`
- Mobile device detection
- Touch gesture handling
- Responsive navigation
- Taskbar scroll synchronization

### Application Lifecycle
1. **Initialization**: DOM ready detection and module loading
2. **Module Setup**: Each module initializes its functionality
3. **Event Binding**: Global keyboard shortcuts and window events
4. **Error Handling**: Graceful error recovery and user feedback

## LaTeX Support

### Supported TeX Elements
- Document structure (`\title`, `\author`, `\section`, etc.)
- Mathematical environments (`theorem`, `definition`, `proof`)
- Equations (`align`, `equation`, display math)
- Tables and lists
- Bibliography and citations
- Text formatting (`\textbf`, `\textit`, etc.)

### KaTeX Integration
- Automatic math rendering with terminal styling
- Support for both inline (`$...$`) and display (`$$...$$`) math
- Custom green terminal theme for mathematical expressions
- Error handling for invalid LaTeX syntax

## Usage

### Development
1. Open `index.html` in a modern browser
2. Ensure local server for file loading (for `.tex` file access)
3. Add `.tex` files to the `article/` directory

### Adding New Articles
1. Place `.tex` files in the `article/` directory
2. The system automatically detects and lists new files
3. Click on article names to load and render content

### Keyboard Shortcuts
- `Ctrl/Cmd + 1-5`: Switch between windows
- `Ctrl/Cmd + F` or `F11`: Toggle fullscreen
- `Ctrl/Cmd + M`: Toggle matrix rain effect
- `Ctrl/Cmd + R`: Refresh current window
- `Escape`: Exit fullscreen or close modals

### Mobile Navigation
- Tap taskbar items to scroll to sections
- Automatic scroll-based section detection
- Touch-optimized interface elements
- Responsive typography and spacing

## Customization

### Theme Modification
Edit `css/variables.css` to change:
- Color scheme (terminal colors, backgrounds)
- Typography (fonts, sizes, spacing)
- Animation timings and effects
- Layout dimensions and spacing

### Adding New Components
1. Create CSS file in `css/components/`
2. Import in `css/main.css`
3. Create corresponding JS module in `js/modules/`
4. Initialize in `js/main.js`

### Extending TeX Support
Modify `TexArticleSystem.js` to add:
- New LaTeX environment parsing
- Custom rendering rules
- Additional mathematical notation
- Enhanced bibliography support

## Browser Compatibility

### Modern Browser Features Required
- ES6 Modules
- CSS Custom Properties
- Fetch API
- CSS Grid and Flexbox
- Intersection Observer (for scroll detection)

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations

### Optimization Features
- CSS imports for better caching
- Modular JavaScript loading
- Efficient scroll event throttling
- Lazy loading of article content
- Optimized animation performance

### Best Practices
- Use CSS transforms for animations
- Throttle scroll and resize events
- Minimize DOM manipulation
- Leverage browser caching
- Progressive enhancement approach

## Future Enhancements

### Planned Features
- Plugin system for custom modules
- Theme switching capability
- Article search and filtering
- Export functionality for articles
- Collaborative editing features

### Technical Improvements
- Service worker for offline support
- WebAssembly for complex LaTeX parsing
- Virtual scrolling for large articles
- Advanced caching strategies
- Performance monitoring integration

## Contributing

### Development Setup
1. Clone the repository
2. Use a local development server
3. Follow the modular architecture patterns
4. Test on both desktop and mobile devices

### Code Style
- Use ES6+ features consistently
- Follow CSS BEM methodology for new components
- Maintain separation of concerns
- Document complex functionality
- Write descriptive commit messages

## License

This project maintains the cyberpunk aesthetic while providing a professional, modular codebase suitable for academic and technical content presentation.
