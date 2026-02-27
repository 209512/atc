// src/contexts/atcApi.ts
const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  backoff?: number;
}

const request = async (url: string, options: RequestOptions = {}) => {
  const { 
    timeout = 5000, 
    retries = 3, 
    backoff = 300, 
    ...fetchOptions 
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${BASE_URL}${url}`, {
          ...fetchOptions,
          headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`API_CLIENT_ERROR: ${response.status}`);
          }
          throw new Error(`API_SERVER_ERROR: ${response.status}`);
        }

        return await response.json().catch(() => ({}));
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError') break; 
        await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
      }
    }
    throw lastError;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const atcApi = {
  toggleGlobalStop: (enable: boolean) => request('/stop', { method: 'POST', body: JSON.stringify({ enable }) }),
  togglePause: (uuid: string, pause: boolean) => request(`/agents/${encodeURIComponent(uuid)}/pause`, { method: 'POST', body: JSON.stringify({ pause }) }),
  togglePriority: (uuid: string, enable: boolean) => request(`/agents/${encodeURIComponent(uuid)}/priority`, { method: 'POST', body: JSON.stringify({ enable }) }),
  updatePriorityOrder: (order: string[]) => request('/agents/priority-order', { method: 'POST', body: JSON.stringify({ order }) }),
  transferLock: (uuid: string) => request(`/agents/${encodeURIComponent(uuid)}/transfer-lock`, { method: 'POST' }),
  triggerOverride: () => request('/override', { method: 'POST' }),
  releaseLock: () => request('/release', { method: 'POST' }),
  terminateAgent: (uuid: string) => request(`/agents/${encodeURIComponent(uuid)}`, { method: 'DELETE' }),
  scaleAgents: (count: number) => request('/agents/scale', { method: 'POST', body: JSON.stringify({ count }) }),
  renameAgent: (uuid: string, newName: string) => request(`/agents/${encodeURIComponent(uuid)}/rename`, { method: 'POST', body: JSON.stringify({ newName }) }),
  updateConfig: (uuid: string, config: any) => request(`/agents/${encodeURIComponent(uuid)}/config`, { method: 'POST', body: JSON.stringify({ config }) }),
};