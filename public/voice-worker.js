/**
 * Nightlink Voice Persistence Worker V8 (Edge Optimized)
 * This worker maintains a high-precision background timer AND
 * perform frequent network "warming" to prevent Edge's Efficiency Mode from sleeping.
 */

let timerId = null;
let intervalMs = 8000; // Increased frequency for V8

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'start') {
    if (timerId) clearInterval(timerId);
    
    intervalMs = payload?.interval || 8000;
    
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
      
      // Network Warming: Touch the server to keep the radio/connection active
      fetch('/api/voice/session?pulse=1').catch(() => null);
    }, intervalMs);
    
    console.log(`[VoiceWorker] Edge Optimized timer started at ${intervalMs}ms`);
  }

  if (type === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    console.log('[VoiceWorker] Worker stopped');
  }

  if (type === 'ping') {
    self.postMessage({ type: 'tick', timestamp: Date.now() });
  }
};
