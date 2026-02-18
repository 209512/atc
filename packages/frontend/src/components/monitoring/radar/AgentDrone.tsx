// src/components/monitoring/radar/AgentDrone.tsx
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useATC } from '@/hooks/system/useATC';
import { useUI } from '@/hooks/system/useUI';
import { useAudio } from '@/hooks/system/useAudio';

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
    const groupRef = useRef<THREE.Group>(null!);
    const { state, isAdminMuted } = useATC();
    const { selectedAgentId, isDark } = useUI();
    const { playSuccess } = useAudio(isAdminMuted);
    
    const prevLocked = useRef(isLocked);
    const isSelected = selectedAgentId === id;
    const isForced = state?.forcedCandidate === id;
    const isGlobalStopped = !!state?.globalStop;

    useEffect(() => {
        if (isGlobalStopped || isOverride || isPaused) {
            prevLocked.current = isLocked;
            return;
        }
        if (prevLocked.current === false && isLocked === true) playSuccess(); 
        prevLocked.current = isLocked;
    }, [isLocked, isPaused, isGlobalStopped, isOverride, playSuccess]);

    useFrame((frameState) => {
        if (!groupRef.current) return;
        if (isGlobalStopped) return;
        if (!isPaused) {
            const rotationSpeed = isForced ? 0.12 : 0.02;
            groupRef.current.rotation.y += rotationSpeed;
            groupRef.current.position.y = position[1] + Math.sin(frameState.clock.elapsedTime * 2 + position[0]) * 0.15;
        }

        const pulseFactor = isForced ? 8 : (isSelected || isPriority ? 3 : 0);
        if (pulseFactor > 0) {
            const s = 1 + Math.sin(frameState.clock.elapsedTime * pulseFactor) * 0.12;
            groupRef.current.scale.set(s, s, s);
        } else {
            groupRef.current.scale.set(1, 1, 1);
        }
    });

    const seizureColor = isDark ? "#BC6FF1" : "#8B5CF6";
    const emergencyRed = isDark ? "#ef4444" : "#b91c1c";
    const coreColor = isForced ? seizureColor : 
                     (isOverride ? emergencyRed : 
                     (isPaused || isGlobalStopped ? '#4b5563' : 
                     (isLocked ? '#10b981' : color)));

    return (
        <group position={position} ref={groupRef}>
            <mesh 
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => (document.body.style.cursor = 'pointer')}
                onPointerOut={() => (document.body.style.cursor = 'auto')}
            >
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial 
                    color={coreColor} 
                    emissive={coreColor} 
                    emissiveIntensity={isGlobalStopped ? 0.2 : 1.5} 
                    wireframe 
                />
            </mesh>

            {(isLocked || isForced) && (
                <Line 
                    points={[[0, 0, 0], [-position[0], -position[1], -position[2]]]} 
                    color={coreColor} 
                    lineWidth={1.5} 
                    transparent 
                    opacity={0.4}
                    dashed={isGlobalStopped} 
                />
            )}
        </group>
    );
};