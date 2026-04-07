/**
 * Nightlink Voice Persistence Worker V9 (Omega Optimization)
 * This worker maintains a high-precision background timer AND
 * perform aggressive network "warming" to prevent Edge/Windows Efficiency Mode from sleeping.
 */

let timerId = null;
let intervalMs = 5000; // Ultra-frequent for V9 Omega

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'start') {
    if (timerId) clearInterval(timerId);
    
    intervalMs = payload?.interval || 5000;
    
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
      
      // Network Warming: Pulse the server to keep the route and radio active
      // Using a random query param to bypass aggressive caching
      fetch(`/api/voice/session?pulse=${Math.random()}`).catch(() => null);
    }, intervalMs);
    
    console.log(`[VoiceWorker] Omega V9 timer started at ${intervalMs}ms`);
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
