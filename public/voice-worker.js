/**
 * Nightlink Voice Persistence Worker
 * This worker maintains a high-precision background timer to prevent 
 * the signaling channel from being throttled by aggressive browser tab sleeping.
 */

let timerId = null;
let intervalMs = 15000;

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'start') {
    if (timerId) clearInterval(timerId);
    
    intervalMs = payload?.interval || 15000;
    
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
    }, intervalMs);
    
    console.log(`[VoiceWorker] Background timer started at ${intervalMs}ms`);
  }

  if (type === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    console.log('[VoiceWorker] Background timer stopped');
  }

  if (type === 'ping') {
    // Immediate tick request
    self.postMessage({ type: 'tick', timestamp: Date.now() });
  }
};
