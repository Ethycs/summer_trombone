/**
 * TexParser Web Worker
 * This script runs in a separate thread and handles the heavy lifting of parsing TeX.
 */

// Import the real parser
import { TexParser } from './TexParser.js';

const parser = new TexParser();

// Listen for messages from the main thread
self.onmessage = function(e) {
    console.log('Worker: Message received from main script');
    const { id, texContent } = e.data;
    
    try {
        // Perform the parsing
        const html = parser.parse(texContent);
        
        // Send the result back to the main thread
        console.log('Worker: Posting message back to main script');
        self.postMessage({ id, html });
    } catch (error) {
        console.error('Worker: Error parsing TeX:', error);
        self.postMessage({ id, html: null, error: error.message });
    }
};
