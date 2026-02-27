// src/hooks/system/useATCStream.ts
import { useEffect, useRef, useCallback } from 'react';
import { Agent, ATCState } from '@/contexts/atcTypes';

const env = (import.meta as any).env;
const STREAM_URL = env?.VITE_API_URL 
  ? `${env.VITE_API_URL}/stream` 
  : 'http://localhost:3000/api/stream';

const getSpiralPos = (i: number): [number, number, number] => {
  const r = 2.5 * Math.sqrt(i + 1);
  const theta = i * 137.508 * (Math.PI / 180);
  return [Math.cos(theta) * r, 0, Math.sin(theta) * r];
};

export const useATCStream = (
  setState: React.Dispatch<React.SetStateAction<ATCState>>,
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>
) => {
  const deletedIds = useRef<Set<string>>(new Set());
  const fieldLocks = useRef<Map<string, Map<string, { value: any, expiry: number }>>>(new Map());
  const lastHolderRef = useRef<string | null>(null);
  const localPersistentLogs = useRef<any[]>([]);
  
  const reconnectTimeoutRef = useRef<any>(null);
  const dataBuffer = useRef<{ agents: any[] | null, state: any | null }>({ agents: null, state: null });
  const rafRef = useRef<number | null>(null);

  const flushBuffer = useCallback(() => {
    const { agents: bufferedAgents, state: bufferedState } = dataBuffer.current;
    const now = Date.now();

    if (bufferedAgents) {
      setAgents((prevAgents) => {
        const processed = bufferedAgents.map((agent: any, i: number) => {
          const originalId = String(agent.id);
          
          if (deletedIds.current.has(originalId)) {
              deletedIds.current.delete(originalId);
          }

          const agentLocks = fieldLocks.current.get(originalId);
          let finalAgent = { ...agent };

          if (agentLocks) {
            agentLocks.forEach((lock, field) => {
              if (lock.expiry > now) finalAgent[field] = lock.value;
              else agentLocks.delete(field);
            });
            if (agentLocks.size === 0) fieldLocks.current.delete(originalId);
          }

          const rawPos = finalAgent.position;
          const prevAgent = prevAgents.find(a => a.id === originalId);
          
          const validPosition = (Array.isArray(rawPos) && rawPos.length === 3) 
            ? (rawPos as [number, number, number]) 
            : (prevAgent?.position || getSpiralPos(i)); 

          return {
            ...finalAgent,
            id: originalId,
            uuid: originalId,
            displayId: agent.displayName || originalId,
            status: String(finalAgent.status || 'idle').toLowerCase() as any,
            position: validPosition
          };
        }).filter(Boolean) as Agent[];

        return processed.sort((a, b) => (a.displayId || '').localeCompare(b.displayId || '', undefined, { numeric: true }));
      });
      dataBuffer.current.agents = null;
    }

    if (bufferedState) {
      setState((prev) => {
        const currentHolder = bufferedState.holder ? String(bufferedState.holder) : null;
        const forcedCandidate = bufferedState.forcedCandidate ? String(bufferedState.forcedCandidate) : null;

        if (currentHolder && lastHolderRef.current !== currentHolder && currentHolder !== 'Human-Operator') {
          const isTransfer = forcedCandidate === currentHolder;
          const newAutoLog = {
            id: `local-auto-${currentHolder}-${now}`,
            timestamp: now,
            agentId: currentHolder,
            message: isTransfer 
              ? `LOCK ACQUIRED (MANUAL TRANSFER)` 
              : `ACQUIRED AUTONOMOUS LOCK`,
            type: 'success'
          };
          localPersistentLogs.current.push(newAutoLog);
          if (localPersistentLogs.current.length > 50) localPersistentLogs.current.shift();
        }
        lastHolderRef.current = currentHolder;

        const serverLogs = (bufferedState.logs || []).map((log: any) => ({
          ...log,
          agentId: String(log.agentId || 'system'),
          agentName: log.agentName || log.agentId,
          id: log.id || `server-${log.timestamp}-${Math.random()}`
        }));

        const uniqueLogsMap = new Map();
        [...prev.logs, ...serverLogs, ...localPersistentLogs.current].forEach(log => {
          uniqueLogsMap.set(log.id, log);
        });

        const combinedLogs = Array.from(uniqueLogsMap.values())
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp)) 
          .slice(-200);

        return { ...prev, ...bufferedState, logs: combinedLogs };
      });
      dataBuffer.current.state = null;
    }
    rafRef.current = null;
  }, [setAgents, setState]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    const connect = () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

      eventSource = new EventSource(STREAM_URL);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.agents) dataBuffer.current.agents = data.agents;
          if (data.state) dataBuffer.current.state = data.state;
          if (!rafRef.current) rafRef.current = requestAnimationFrame(flushBuffer);
        } catch (err) { console.error("Stream Parsing Error:", err); }
      };
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [flushBuffer]);

  const markAction = useCallback((agentId: string, field: string, value: any, isDelete: boolean = false) => {
      const originalId = String(agentId);
      if (isDelete) {
          deletedIds.current.add(originalId);
          fieldLocks.current.delete(originalId);
          setState(prev => ({ ...prev, priorityAgents: (prev.priorityAgents || []).filter(id => id !== originalId) }));
      } else if (field) {
          if (!fieldLocks.current.has(originalId)) fieldLocks.current.set(originalId, new Map());
          fieldLocks.current.get(originalId)?.set(field, { value, expiry: Date.now() + 5000 });
      }
  }, [setState]);

  return { markAction };
};