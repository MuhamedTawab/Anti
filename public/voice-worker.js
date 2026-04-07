/**
 * Nightlink Voice Persistence Worker V6
 * This worker maintains a high-precision background timer AND
 * perform network "warming" to prevent the OS from sleeping the network card.
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
      
      // Network Warming: Touch the server to keep the radio/connection active
      fetch('/api/voice/session?pulse=1').catch(() => null);
    }, intervalMs);
    
    console.log(`[VoiceWorker] Unstoppable timer started at ${intervalMs}ms`);
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
