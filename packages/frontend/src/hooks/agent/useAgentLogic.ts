// src/hooks/agent/useAgentLogic.ts
import { useMemo } from 'react';
import { Agent, ATCState } from '@/contexts/atcTypes';

/**
 * 에이전트의 현재 상태를 계산하고 UI 스타일 결정에 필요한 메타데이터를 반환합니다.
 * @param agent 개별 에이전트 객체
 * @param state ATC 전역 상태
 */
export const useAgentLogic = (agent: Agent, state: ATCState) => {
  // state가 로딩 전이거나 undefined일 경우를 대비한 안전한 기본 객체 생성
  const s = useMemo(() => state || { 
    holder: null, 
    globalStop: false, 
    waitingAgents: [], 
    forcedCandidate: null, 
    logs: [],
    overrideSignal: false 
  }, [state]);

  // 1. 제어권 및 잠금 상태 판단 (안전한 's' 참조)
  const isLocked = useMemo(() => s.holder === agent.id, [s.holder, agent.id]);

  // 2. 정지 상태 판단 (개별 정지 OR 시스템 전체 정지)
  const isPaused = useMemo(() => {
    const status = String(agent.status || '').toLowerCase();
    return status === 'paused' || agent.isPaused === true || s.globalStop === true;
  }, [agent.status, agent.isPaused, s.globalStop]);

  // 3. 제어권 이양 시도(강제 점유) 대상인지 확인
  const isForced = useMemo(() => s.forcedCandidate === agent.id, [s.forcedCandidate, agent.id]);

  // 4. 우선순위 에이전트 여부
  const isPriority = useMemo(() => !!agent.priority, [agent.priority]);

  // 5. 비상 상황(오버라이드) 발생 여부
  const isOverride = useMemo(() => !!s.overrideSignal, [s.overrideSignal]);

  // 6. 대기열(Waiting) 상태 확인
  const isWaiting = useMemo(() => 
    s.waitingAgents?.includes(agent.id) || agent.status === 'waiting',
    [s.waitingAgents, agent.id, agent.status]
  );

  return {
    isLocked,
    isPaused,
    isForced,
    isPriority,
    isOverride,
    isWaiting,
    // UI에 표시될 최종 상태 텍스트
    statusLabel: isOverride ? 'EMERGENCY' : 
                 isForced ? 'SEIZING...' : 
                 isPaused ? 'HALTED' : 
                 isLocked ? 'ACTIVE_CONTROL' : 
                 isWaiting ? 'IN_QUEUE' : 'STANDBY'
  };
};