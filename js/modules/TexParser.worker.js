/**
 * TexParser Web Worker
 * This script runs in a separate thread and handles the heavy lifting of parsing TeX.
 */

// A simplified, safe version of the parser to run in the worker.
class TexParser {
    parse(texContent) {
        // In a real scenario, the full complex parser would live here.
        // For this example, we'll keep it simple to demonstrate the worker concept.
        const safeContent = texContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Simulate some work
        const startTime = Date.now();
        while (Date.now() - startTime < 500) {
            // Chewing on the data...
        }

        return `<p>Content parsed successfully by the Web Worker.</p><pre>${safeContent}</pre>`;
    }
}

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
