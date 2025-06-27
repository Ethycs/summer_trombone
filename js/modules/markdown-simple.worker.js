// Simple test worker
console.log('[markdown-simple.worker] Worker starting...');

self.onmessage = ({ data }) => {
  console.log('[markdown-simple.worker] Message received:', data);
  
  try {
    const { id, markdown } = data;
    
    // For now, just return a simple HTML response
    const html = `<div class="markdown-content">
      <p>Worker is functioning!</p>
      <p>Received markdown with ${markdown?.length || 0} characters</p>
      <p>Message ID: ${id}</p>
      <pre>${markdown?.substring(0, 100)}...</pre>
    </div>`;
    
    self.postMessage({ 
      id, 
      html, 
      manifest: [] 
    });
    
  } catch (err) {
    console.error('[markdown-simple.worker] Error:', err);
    self.postMessage({ 
      id: data.id, 
      html: `<div class="error-message">Worker error: ${err.message}</div>`,
      manifest: []
    });
  }
};

console.log('[markdown-simple.worker] Worker ready');