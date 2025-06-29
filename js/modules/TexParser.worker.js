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
    const texContent = e.data;
    
    // Perform the parsing
    const html = parser.parse(texContent);
    
    // Send the result back to the main thread
    console.log('Worker: Posting message back to main script');
    self.postMessage(html);
};
