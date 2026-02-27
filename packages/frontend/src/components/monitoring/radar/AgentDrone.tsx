// src/components/monitoring/radar/AgentDrone.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line as DreiLine } from '@react-three/drei';
import * as THREE from 'three';
import { Star, Pause } from 'lucide-react';
import clsx from 'clsx';
import { useATC } from '@/hooks/system/useATC';
import { useUI } from '@/hooks/system/useUI';
import { useAudio } from '@/hooks/system/useAudio';
import { AgentDetailPopup } from '@/components/monitoring/radar/AgentDetailPopup';

interface AgentDroneProps {
    id: string;
    position: [number, number, number];
    isLocked: boolean;
    isOverride: boolean;
    color: string;
    onClick: (id: string) => void;
    isPaused: boolean; 
    isPriority: boolean;
}

export const AgentDrone = ({ 
    id, position = [0, 0, 0], isLocked, isOverride, color, 
    onClick, isPaused, isPriority 
}: AgentDroneProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const { state, isAdminMuted, agents, togglePause, togglePriority, transferLock, terminateAgent } = useATC();
    const { selectedAgentId, isDark, setSelectedAgentId } = useUI();
    const { playSuccess } = useAudio(isAdminMuted);

    const isGlobalStopped = !!state?.globalStop;
    const isSelected = selectedAgentId === id;
    const isForced = state?.forcedCandidate === id;

    const currentPos = useRef(new THREE.Vector3(...position));
    const targetVec = useRef(new THREE.Vector3(...position));
    const prevLocked = useRef(isLocked);
    
    const isResuming = useRef(false);

    const agentData = useMemo(() => agents.find(a => a.id === id), [agents, id]);
    const displayId = agentData?.displayId || id;

    useEffect(() => {
        if (isLocked && !prevLocked.current) {
            playSuccess();
        }
        prevLocked.current = isLocked;
    }, [isLocked, playSuccess]);

    useEffect(() => {
        const effectivelyPaused = isPaused || isGlobalStopped;
        if (!effectivelyPaused) {
            isResuming.current = true;
            if (groupRef.current) {
                targetVec.current.copy(groupRef.current.position);
            }
            const timer = setTimeout(() => { isResuming.current = false; }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isPaused, isGlobalStopped]);

    useFrame((frameState) => {
        if (!groupRef.current) return;

        const effectivelyPaused = isPaused || isGlobalStopped;

        if (effectivelyPaused) {
            groupRef.current.position.copy(currentPos.current);
        } else {
            targetVec.current.set(position[0], position[1], position[2]);

            const lerpFactor = isResuming.current ? 0.02 : 0.06;

            groupRef.current.position.lerp(targetVec.current, lerpFactor);
            currentPos.current.copy(groupRef.current.position);

            groupRef.current.rotation.y += isForced ? 0.08 : 0.02;
            groupRef.current.position.y += Math.sin(frameState.clock.elapsedTime * 0.8) * 0.0015;
        }

        const pulseFactor = isOverride ? 12 : (isForced ? 8 : (isSelected || isPriority ? 3 : 0));
        if (pulseFactor > 0) {
            const s = 1 + Math.sin(frameState.clock.elapsedTime * pulseFactor) * 0.12;
            groupRef.current.scale.set(s, s, s);
        } else {
            groupRef.current.scale.set(1, 1, 1);
        }
    });

    const coreColor = isOverride ? (isDark ? "#ef4444" : "#b91c1c") : 
                     isForced ? (isDark ? "#BC6FF1" : "#8B5CF6") : 
                     isLocked ? '#10b981' : 
                     (isPaused || isGlobalStopped) ? (isDark ? '#94a3b8' : '#64748b') :
                     isPriority ? (isDark ? "#f59e0b" : "#d97706") : color;

    return (
        <>
            {isGlobalStopped && (
                <group>
                    {[...Array(12)].map((_, i) => (
                        <mesh key={`dot-${id}-${i}`} position={currentPos.current.clone().multiplyScalar((i + 1) / 13)}>
                            <sphereGeometry args={[0.04, 6, 6]} />
                            <meshBasicMaterial color={coreColor} transparent opacity={0.6} />
                        </mesh>
                    ))}
                </group>
            )}

            <group ref={groupRef}>
                <mesh onClick={(e) => { e.stopPropagation(); onClick(id); }}>
                    <sphereGeometry args={[1.5, 8, 8]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>

                <mesh>
                    <octahedronGeometry args={[0.5, 0]} />
                    <meshStandardMaterial 
                        color={coreColor} 
                        emissive={coreColor} 
                        emissiveIntensity={(isPaused || isGlobalStopped) ? 0.5 : 1.5} 
                        wireframe 
                    />
                </mesh>

                <DroneLabel 
                    displayId={displayId} isDark={isDark} isLocked={isLocked}
                    isSelected={isSelected} isPaused={isPaused || isGlobalStopped}
                    isPriority={isPriority} isOverride={isOverride}
                />

                {isSelected && agentData && (
                    <AgentDetailPopup 
                        agent={agentData} position={[0, 0, 0]} 
                        onClose={() => setSelectedAgentId(null)} isDark={isDark}
                        onTerminate={terminateAgent} onTogglePriority={togglePriority}
                        onTransferLock={transferLock} onTogglePause={togglePause}
                    />
                )}

                {(isLocked || isForced) && !isGlobalStopped && (
                    <DreiLine 
                        points={[[0, 0, 0], [-currentPos.current.x, -currentPos.current.y, -currentPos.current.z]]} 
                        color={coreColor} 
                        lineWidth={1.2} 
                        transparent 
                        opacity={0.4} 
                    />
                )}
            </group>
        </>
    );
};

const DroneLabel = ({ displayId, isDark, isLocked, isSelected, isPaused, isPriority, isOverride }: any) => (
    <Html position={[0, 0.9, 0]} center distanceFactor={12} zIndexRange={[0, 10]} style={{ pointerEvents: 'none' }}>
        <div className={clsx(
            "px-1.5 py-0.5 rounded text-[9px] font-mono border backdrop-blur-sm flex items-center gap-1 whitespace-nowrap select-none transition-all",
            isDark ? "bg-black/60 border-white/20 text-white" : "bg-white/90 border-slate-300 text-slate-700 shadow-sm",
            isLocked && !isPaused && !isOverride && (isDark ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" : "bg-emerald-50 border-emerald-500 text-emerald-600"),
            isOverride && "bg-red-500/20 border-red-500 text-red-500 animate-pulse",
            isSelected && "ring-1 ring-blue-500/50 scale-110 z-30",
            isPaused && (isDark ? "opacity-80 border-gray-500 bg-gray-900/50" : "opacity-50 grayscale")
        )}>
            {isPriority && !isOverride && <Star size={8} className={clsx("fill-current", isDark ? "text-yellow-500" : "text-amber-500")} />}
            {isPaused && <Pause size={7} className="fill-current text-gray-300" />}
            <span className={clsx(isPaused && "line-through decoration-1 opacity-90 text-gray-300")}>
                {isOverride ? `OVERRIDING...` : (isPaused ? `[P] ${displayId}` : displayId)}
            </span>
        </div>
    </Html>
);