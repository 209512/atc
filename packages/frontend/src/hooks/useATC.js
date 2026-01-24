import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export const useATC = () => {
  const [state, setState] = useState({
    resourceId: 'atc-lock',
    holder: null,
    collisionCount: 0,
    overrideSignal: false,
    fencingToken: null,
    latency: 0,
    timestamp: Date.now()
  });

  const eventSourceRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // SSE Connection
    const eventSource = new EventSource(`${API_URL}/api/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(data);
        
        // Check for specific events to toast
        if (data.overrideSignal && !state.overrideSignal) {
             // Just a signal update, maybe not toast here to avoid spam, 
             // but checking edge detection
        }
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
      // Simple retry logic could be added here
    };

    return () => {
      eventSource.close();
    };
  }, []); // Empty dependency array = run once

  const triggerOverride = async () => {
    try {
      const res = await fetch(`${API_URL}/api/override`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`⚠️ AI OVERRIDE: Human Priority Executed. ${data.message}`);
      } else {
        toast.error(`Override Failed: ${data.message}`);
      }
    } catch (err) {
      toast.error('Network Error during Override');
    }
  };
  
  const releaseLock = async () => {
      try {
          await fetch(`${API_URL}/api/release`, { method: 'POST' });
          toast.info('Lock Released');
      } catch (e) {
          toast.error('Failed to release');
      }
  };

  const simulateConflict = async () => {
    // We can't easily "trigger" the backend simulation via API if it's already running loops,
    // but maybe we can just spawn MORE agents or just let the loop run.
    // The prompt says "Triggers 5 concurrent lock requests".
    // Since the backend `agentLoop` is running, maybe we just add a new endpoint or ignore?
    // Wait, the prompt implies client-side requests?
    // "Triggers 5 concurrent lock requests to the backend."
    // But the backend `agentLoop` is internal.
    // Ah, maybe the user wants *frontend* to hit an endpoint that tries to acquire the lock?
    // OR, I should add an endpoint `POST /api/simulate-conflict`?
    // The backend `atc.service.js` has `spawnAgent`. I can expose that?
    // Let's assume for now I can't change backend easily without re-reading.
    // I'll check `index.js` again.
    // Wait, I implemented the backend. I can add an endpoint if needed.
    // BUT I shouldn't modify backend unless necessary.
    // The prompt says "Triggers 5 concurrent lock requests".
    // If I hit `/api/lock` (which doesn't exist yet)?
    // The prompt context says "Use this for ... Lock requests (/api/lock)".
    // Ah! The PROMPT in the PREVIOUS turn said `/api/stream` and `/api/lock`.
    // BUT I implemented `/api/override` and `/api/release`.
    // I missed implementing a generic `/api/lock` for "external" agents.
    // However, the backend simulation is running internally.
    // Let's implement `simulateConflict` as "hitting the backend with 5 concurrent requests to a new endpoint or just firing fetch".
    // I'll use `/api/override`? No, that's human.
    // I will just toast "Simulation Triggered" and maybe call a stub or `spawnAgent` if I added it?
    // I'll stick to visual simulation if backend doesn't support it, OR I'll add the endpoint.
    // The backend `index.js` I wrote has: `/api/stream`, `/api/override`, `/api/release`.
    // It does NOT have `/api/lock`.
    // I will assume for "Simulate AI Conflict", I might need to update backend or just pretend.
    // BETTER: I'll update backend to support `POST /api/spawn-agents`?
    // Or just let the existing agents fight.
    // Actually, "Triggers 5 concurrent lock requests" might mean *from the browser*?
    // If so, I need an endpoint that tries to lock.
    // Let's implement `simulateConflict` to just log/toast for now, or assume the backend simulation is enough.
    // Wait, the user prompt says: "Simulate AI Conflict button: Triggers 5 concurrent lock requests to the backend."
    // This implies network traffic.
    // I will add a `POST /api/lock` endpoint to backend quickly, then use it.
    
    // For now, in this file, I'll just write the function to hit `/api/lock`.
    
    const requests = Array(5).fill(0).map((_, i) => 
        fetch(`${API_URL}/api/lock`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requester: `Client-Sim-${i}` })
        })
    );
    
    toast.info('🚀 Launching 5 concurrent AI Agents...');
    await Promise.allSettled(requests);
  };

  return { state, triggerOverride, releaseLock, simulateConflict };
};
