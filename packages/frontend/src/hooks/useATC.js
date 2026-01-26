import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useATC = () => {
  const [state, setState] = useState({
    resourceId: 'atc-lock',
    holder: null,
    collisionCount: 0,
    overrideSignal: false,
    fencingToken: null,
    latency: 0,
    activeAgentCount: 2,
    timestamp: Date.now()
  });

  const eventSourceRef = useRef(null);

  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/api/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE Connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(data);
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const triggerOverride = async () => {
    // Optimistic Update
    setState(prev => ({ ...prev, overrideSignal: true, holder: 'Human (Pending)...' }));
    
    try {
      const res = await fetch(`${API_URL}/api/override`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`⚠️ AI OVERRIDE: Human Priority Executed. ${data.message}`);
        // Backend SSE will confirm the state, but we ensure it here too if needed
      } else {
        toast.error(`Override Failed: ${data.message}`);
        // Revert optimistic update if failed
        setState(prev => ({ ...prev, overrideSignal: false, holder: null }));
      }
    } catch (err) {
      toast.error('Network Error during Override');
      setState(prev => ({ ...prev, overrideSignal: false, holder: null }));
    }
  };
  
  const releaseLock = async () => {
      // Optimistic Update
      setState(prev => ({ ...prev, overrideSignal: false, holder: null }));

      try {
          await fetch(`${API_URL}/api/release`, { method: 'POST' });
          toast.info('Lock Released');
      } catch (e) {
          toast.error('Failed to release');
      }
  };

  const setTrafficIntensity = async (count) => {
    if (setTrafficIntensity.timeout) clearTimeout(setTrafficIntensity.timeout);
    
    setTrafficIntensity.timeout = setTimeout(async () => {
        try {
            await fetch(`${API_URL}/api/agents/scale`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });
            toast.info(`🚦 Traffic Intensity set to: ${count}`);
        } catch (e) {
            toast.error('Failed to scale agents');
        }
    }, 300);
  };

  return { state, triggerOverride, releaseLock, setTrafficIntensity };
};
