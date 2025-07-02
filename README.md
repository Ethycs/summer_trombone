# SummerTrombone Terminal - Modular Architecture

A cyberpunk-themed terminal blog interface with integrated KaTeX support for rendering LaTeX articles from `.tex` files and Markdown support for `.md` files.

## System Architecture

The system is built around a centralized `FileSystemSync` module. This module is responsible for managing a virtual filesystem, providing real-time updates for both development (using Vite's Hot Module Replacement) and production environments (by polling a `filesystem.json` manifest).

Key characteristics:

*   **Single Source of Truth:** A single instance of `FileSystemSync` is created in `js/main.js` and shared across all other modules that need filesystem access.
*   **Shared Instance:** Modules like `MarkdownArticleSystem`, `TexPaperSystem`, and `TerminalContentLoader` receive the `FileSystemSync` instance in their constructors, ensuring they all work with the same data.
*   **Efficiency:** This approach avoids redundant filesystem scanning and state management, improving performance and ensuring data consistency.

## Development

This project uses Vite for development. The following npm scripts are available:

*   `npm run dev`: Starts the Vite development server. This is the standard command for running the application locally.
*   `npm run build`: Builds the application for production.
*   `npm run dev:scripts`: Runs the Vite development server with a special flag to execute development-time scripts, such as the filesystem manifest generator.

## Project Structure

```
summer_trombone/
├── index.html              # Main HTML file
├── README.md               # This file
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite configuration
├── css/
│   └── ...                 # Stylesheets
├── js/
│   ├── main.js             # Main application entry point
│   └── modules/
│       ├── FileSystemSync.js      # Centralized filesystem management
│       ├── MarkdownArticleSystem.js # Renders .md files
│       ├── TexPaperSystem.js      # Renders .tex files
│       ├── TerminalContentLoader.js # Loads content into the terminal
│       └── ...             # Other modules
└── blog/
    ├── posts/              # Markdown posts
    └── papers/             # TeX papers
```

## JavaScript Architecture

### Module System
ES6 modules with clear separation of concerns:

#### `FileSystemSync.js`
- Manages the virtual filesystem.
- Provides real-time updates via Vite HMR in development.
- Polls a manifest file in production.
- Notifies other modules of file changes.

#### `MarkdownArticleSystem.js`
- Renders Markdown (`.md`) files.
- Uses the shared `FileSystemSync` instance to access file content.
- Supports various Markdown extensions like KaTeX, Mermaid diagrams, and more.

#### `TexPaperSystem.js`
- Renders LaTeX (`.tex`) files.
- Uses the shared `FileSystemSync` instance.
- Provides KaTeX rendering for mathematical notation.

#### `TerminalContentLoader.js`
- Renders article summaries in the main terminal window.
- Uses the shared `FileSystemSync` instance to get the list of articles.

#### `WindowManager.js`
- Manages draggable and resizable windows.

## Usage

### Adding New Articles
1.  Place `.md` files in the `blog/posts/` directory.
2.  Place `.tex` files in the `blog/papers/` directory.
3.  The system automatically detects and lists new files.

### Keyboard Shortcuts
- `Ctrl/Cmd + 1-5`: Switch between windows
- `Ctrl/Cmd + F` or `F11`: Toggle fullscreen
- `Ctrl/Cmd + M`: Toggle matrix rain effect
- `Ctrl/Cmd + R`: Refresh current window
- `Escape`: Exit fullscreen or close modals

## License

This project maintains the cyberpunk aesthetic while providing a professional, modular codebase suitable for academic and technical content presentation.
