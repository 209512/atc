import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import clsx from 'clsx';
import { useATC } from '../../hooks/useATC';
import { useTacticalActions } from '../../hooks/useTacticalActions';
import { Agent } from '../../contexts/atcTypes';

import { CentralHub } from './CentralHub';
import { AgentDrone } from './AgentDrone';
import { AgentDetailPopup } from './AgentDetailPopup';
import { RadarBackground } from './RadarBackground';

const getSafeStatusString = (status: any): string => {
    if (status === null || status === undefined) return 'idle';
    
    if (typeof status === 'string') return status.toLowerCase();
    
    if (typeof status === 'object') {
        const val = status.value || status.status || status.label || 'idle';
        return String(val).toLowerCase();
    }
    
    try {
        return String(status).toLowerCase();
    } catch (e) {
        return 'idle';
    }
};

export const Radar = ({ compact = false, isMainView = false }: { compact?: boolean; isMainView?: boolean }) => {
    const { state, agents, isDark, setSelectedAgentId, selectedAgentId } = useATC();
    const { onTogglePause, terminateAgent, togglePriority, onTransferLock } = useTacticalActions();

    const holder = state?.holder || null;
    const overrideSignal = !!state?.overrideSignal;
    const globalStop = !!state?.globalStop;
    
    const selectedAgent = Array.isArray(agents) 
        ? agents.find((a: Agent) => a && a.id === selectedAgentId) 
        : null;

    return (
        <div className={clsx(
            "relative w-full h-full overflow-hidden transition-colors duration-500", 
            isDark ? "bg-[#050505]" : "bg-[#f8fafc]"
        )}>
            <Canvas camera={{ position: [0, 8, 12], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <RadarBackground isDark={isDark} />
                
                <CentralHub 
                    isLocked={!!holder} 
                    isOverride={overrideSignal} 
                    holder={holder} 
                    isDark={isDark} 
                />

                {/* 에이전트 렌더링 섹션 */}
                {Array.isArray(agents) && agents.map((agent: Agent) => {
                    if (!agent || !agent.id) return null;
                    const currentStatus = getSafeStatusString(agent.status);

                    return (
                        <AgentDrone 
                            key={agent.id} 
                            id={agent.id} 
                            position={agent.position || [0, 0, 0]}
                            isLocked={holder === agent.id} 
                            isOverride={overrideSignal}
                            color="#3b82f6" 
                            isDark={isDark} 
                            onClick={setSelectedAgentId}
                            isSelected={selectedAgentId === agent.id}
                            isPaused={currentStatus === 'paused' || globalStop}
                            isPriority={!!agent.priority}
                        />
                    );
                })}

                {/* 상세 팝업 섹션 */}
                {selectedAgentId && selectedAgent && (
                    <AgentDetailPopup 
                        agent={selectedAgent} 
                        position={selectedAgent.position || [0, 0, 0]}
                        onClose={() => setSelectedAgentId(null)} 
                        isDark={isDark}
                        onTerminate={terminateAgent} 
                        onTogglePriority={togglePriority}
                        onTransferLock={onTransferLock} 
                        onTogglePause={onTogglePause}
                    />
                )}

                <OrbitControls 
                    enableZoom 
                    enablePan 
                    autoRotate={!holder} 
                    autoRotateSpeed={0.5} 
                    makeDefault 
                />
            </Canvas>
        </div>
    );
};