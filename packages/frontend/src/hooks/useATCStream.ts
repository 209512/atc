import { useEffect, useRef, useCallback } from 'react';
import { Agent, ATCState } from '../contexts/atcTypes';

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
  const localStatusLock = useRef<Map<string, { status: string, expiry: number }>>(new Map());
  const lastHolderRef = useRef<string | null>(null);
  const localPersistentLogs = useRef<any[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = Date.now();
        
        if (data.agents && Array.isArray(data.agents)) {
          setAgents((prevAgents) => {
            const serverAgents = data.agents as any[];
            const processed: Agent[] = [];

            serverAgents.forEach((agent: any, i: number) => {
              const originalId = String(agent.id);
              if (deletedIds.current.has(originalId)) {
                  deletedIds.current.delete(originalId);
                  localStatusLock.current.delete(originalId);
              }
              const lock = localStatusLock.current.get(originalId);
              let finalStatus = agent.status;
              if (lock && lock.expiry > now) finalStatus = lock.status;

              processed.push({
                ...agent,
                id: originalId,
                displayId: agent.name || originalId,
                status: String(finalStatus || 'idle').toLowerCase() as any,
                position: agent.position || getSpiralPos(i)
              });
            });
            return processed.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
          });
        }

        if (data.state) {
          setState((prev) => {
            const currentHolder = data.state.holder ? String(data.state.holder) : null;
            const forcedCandidate = data.state.forcedCandidate ? String(data.state.forcedCandidate) : null;

            if (currentHolder && lastHolderRef.current !== currentHolder && currentHolder !== 'Human-Operator') {
              const isTransfer = forcedCandidate === currentHolder;
              
              const newAutoLog = {
                id: `local-auto-${currentHolder}-${Date.now()}`,
                timestamp: Date.now(),
                agentId: currentHolder,
                message: isTransfer 
                  ? `[${currentHolder}] LOCK ACQUIRED (MANUAL TRANSFER)` 
                  : `[${currentHolder}] ACQUIRED AUTONOMOUS LOCK`,
                type: 'success'
              };
              
              localPersistentLogs.current.push(newAutoLog);
              if (localPersistentLogs.current.length > 50) {
                localPersistentLogs.current.shift();
              }
            }
            lastHolderRef.current = currentHolder;

            const serverLogs = (data.state.logs || []).map((log: any) => ({
              ...log,
              agentId: String(log.agentId || 'system'),
              id: log.id || `server-${log.timestamp}-${Math.random()}`
            }));

            const combinedLogs = [...prev.logs, ...serverLogs, ...localPersistentLogs.current]
              .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
              .sort((a, b) => {
                const timeA = Number(a.timestamp);
                const timeB = Number(b.timestamp);
                if (timeA !== timeB) return timeA - timeB;
                return String(a.id).localeCompare(String(b.id));
              }) 
              .slice(-200);

            return { 
              ...prev, 
              ...data.state, 
              logs: combinedLogs 
            };
          });
        }
      } catch (err) { 
        console.error("Stream Error:", err); 
      }
    };

    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [setState, setAgents]);

  const markAction = useCallback((agentId: string, field: string, value: any, isDelete: boolean = false) => {
      const originalId = String(agentId);
      if (isDelete) {
          deletedIds.current.add(originalId);
          localStatusLock.current.delete(originalId);
          localPersistentLogs.current = localPersistentLogs.current.filter(
            log => String(log.agentId) !== originalId
          );

          setState(prev => ({
            ...prev,
            logs: prev.logs.filter(log => String(log.agentId) !== originalId),
            priorityAgents: (prev.priorityAgents || []).filter(id => id !== originalId)
          }));
      } else if (field === 'status') {
          localStatusLock.current.set(originalId, { status: value, expiry: Date.now() + 5000 });
      }
  }, [setState]);

  return { markAction };
};