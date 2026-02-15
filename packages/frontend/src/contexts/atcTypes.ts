export interface LogEntry {
  id: string;
  agentId: string;
  message: string;
  messageStd?: string;
  messageTech?: string;
  timestamp: Date | number;
  type: 'info' | 'error' | 'success' | 'system' | 'warn' | 'critical' | 'CRITICAL';
}

export interface Agent {
  id: string;
  model: string;
  status: 'active' | 'waiting' | 'idle' | 'paused';
  activity?: string;
  priority?: boolean;
  isPaused?: boolean;
  position: [number, number, number];
}

export interface ATCState {
  holder: string | null;
  waitingAgents: string[];
  priorityAgents: string[];
  forcedCandidate: string | null;
  globalStop: boolean;
  collisionCount: number;
  logs: LogEntry[];
  activeAgentCount: number;
  overrideSignal: boolean; 
  latency: number;
  trafficIntensity: number;
}

export interface AgentMeta {
  isLocked: boolean;
  isWaiting: boolean;
  isPriority: boolean;
  isForced: boolean;
  isPaused: boolean;
  statusLabel: string;
  themeColor: string;
  glowIntensity: number;
}