/**
 * 백엔드 index.js의 실제 라우트와 100% 일치시킨 API 명세
 */
const BASE_URL = 'http://localhost:3000/api';

export const atcApi = {
  // 시스템 전체 정지 (/api/stop)
  toggleGlobalStop: (enable: boolean) =>
    fetch(`${BASE_URL}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable }),
    }),

  // 에이전트 일시정지 (/api/agents/:id/pause)
  togglePause: (agentId: string, pause: boolean) =>
    fetch(`${BASE_URL}/agents/${agentId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pause }),
    }),

  // 우선권 설정 (/api/agents/:id/priority)
  togglePriority: (agentId: string, enable: boolean) => 
    fetch(`${BASE_URL}/agents/${agentId}/priority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable }),
    }),

  updatePriorityOrder: async (order: string[]) => {
    const response = await fetch('http://localhost:3000/api/agents/priority-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    return response.json();
  },

  // 강제 점유 (/api/agents/:id/transfer-lock)
  transferLock: (agentId: string) =>
    fetch(`${BASE_URL}/agents/${agentId}/transfer-lock`, { method: 'POST' }),

  // 시스템 오버라이드 (/api/override)
  triggerOverride: () =>
    fetch(`${BASE_URL}/override`, { method: 'POST' }),

  // 오버라이드 해제 (/api/release)
  releaseLock: () =>
    fetch(`${BASE_URL}/release`, { method: 'POST' }),

  // 에이전트 삭제 (/api/agents/:id)
  terminateAgent: (agentId: string) =>
    fetch(`${BASE_URL}/agents/${agentId}`, { method: 'DELETE' }),

  // 에이전트 개수 조절 (/api/agents/scale)
  scaleAgents: (count: number) =>
    fetch(`${BASE_URL}/agents/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    }),

  // 에이전트 설정 변경 (/api/agents/:id/config)
  updateConfig: (agentId: string, config: any) =>
    fetch(`${BASE_URL}/agents/${agentId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }),
    
  // 에이전트 이름 변경 (/api/agents/:id/rename)
  renameAgent: (oldId: string, newId: string) =>
    fetch(`${BASE_URL}/agents/${oldId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newId }),
    }),
};