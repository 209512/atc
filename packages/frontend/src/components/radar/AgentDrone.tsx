import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { Star, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useATC } from '../../hooks/useATC';
import { useAudio } from '../../hooks/useAudio';

interface AgentDroneProps {
    id: string;
    position: [number, number, number];
    isLocked: boolean;
    isOverride: boolean;
    color: string;
    isDark: boolean;
    onClick: (id: string) => void;
    isSelected: boolean;
    isPaused: boolean;
    isPriority: boolean;
}

export const AgentDrone = ({ 
    id, position = [0, 0, 0], isLocked, isOverride, color, isDark, 
    onClick, isSelected, isPaused, isPriority 
}: AgentDroneProps) => {
    const mesh = useRef<any>(null!);
    const { state, isAdminMuted } = useATC();
    const { playSuccess } = useAudio(isAdminMuted);
    
    const prevLocked = useRef(isLocked);
    const isForced = state.forcedCandidate === id;

    const seizureColor = isDark ? "#BC6FF1" : "#8B5CF6";
    const emergencyRed = isDark ? "#ef4444" : "#b91c1c";

    useEffect(() => {
        if (state.globalStop || isOverride || isPaused) {
            prevLocked.current = isLocked;
            return;
        }

        if (prevLocked.current === false && isLocked === true) {
            playSuccess(); 
        }
        
        prevLocked.current = isLocked;
    }, [isLocked, isPaused, state.globalStop, isOverride, playSuccess]);

    useFrame((state) => {
        if (mesh.current) {
            if (!isPaused || isForced) {
                const rotationSpeed = isForced ? 0.08 : 0.02;
                mesh.current.rotation.y += rotationSpeed;
                mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
            }
            
            if (isForced || isSelected) {
                const pulseSpeed = isForced ? 8 : 5;
                const s = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.12;
                mesh.current.scale.set(s, s, s);
            } else if (isPriority) {
                const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
                mesh.current.scale.set(s, s, s);
            } else {
                mesh.current.scale.set(1, 1, 1);
            }
        }
    });

    const priorityColor = isDark ? '#facc15' : '#f59e0b';
    const baseColor = isPriority ? priorityColor : color;
    const pauseCoreColor = isDark ? '#64748b' : '#94a3b8';
    const pauseEmissiveColor = isDark ? '#334155' : '#cbd5e1';
    
    const coreColor = isForced ? seizureColor : (isOverride ? emergencyRed : (isPaused ? pauseCoreColor : (isLocked ? '#10b981' : baseColor)));
    const emissiveColor = isForced ? seizureColor : (isOverride ? emergencyRed : (isLocked ? '#10b981' : (isPaused ? '#222222' : baseColor)));
    const emissiveIntensity = isForced ? 3 : (isLocked || isOverride ? 2 : (isSelected || isPriority ? 1 : (isPaused ? 0.3 : 0.5)));

    const labelClassName = clsx(
        "px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap border backdrop-blur-sm transition-all flex items-center gap-1",
        isForced && "bg-purple-600/40 border-purple-400 text-white animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.5)]",
        isOverride && !isForced && (isDark ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : "bg-red-50 border-red-600 text-red-700 animate-pulse font-bold"),
        isPaused && !isForced && !isOverride && (isDark ? "bg-gray-900/40 border-gray-800 text-gray-600 opacity-50 shadow-none" : "bg-gray-100/30 border-gray-200 text-gray-400 opacity-40 shadow-none"),
        isLocked && !isForced && !isOverride && !isPaused && "bg-emerald-500/20 border-emerald-500 text-emerald-500 scale-110 font-bold",
        isPriority && !isForced && !isOverride && !isPaused && !isLocked && (isDark ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 font-bold" : "bg-amber-500/20 border-amber-500 text-amber-600 font-bold"),
        !isForced && !isOverride && !isPaused && !isLocked && !isPriority && (isDark ? "bg-black/60 border-white/30 text-white" : "bg-white/80 border-black/20 text-black")
    );

    return (
        <group position={position} ref={mesh} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <mesh>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color={coreColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} wireframe={true} />
            </mesh>
            <mesh scale={[1.2, 1.2, 1.2]}>
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial color={isForced ? seizureColor : (isPaused ? (isDark ? "#94a3b8" : "#94a3b8") : (isDark ? "white" : "black"))} transparent opacity={isForced ? 0.3 : (isPaused ? 0.2 : 0.1)} wireframe />
            </mesh>
            <Html position={[0, 0.8, 0]} center distanceFactor={10}>
                <div className={labelClassName}>
                    {isForced && <Zap size={8} className="fill-current animate-bounce" />}
                    {isPriority && !isForced && <Star size={8} className="fill-current" />}
                    <span>{id}</span>
                    <span>{isForced ? " [SEIZING]" : (isLocked ? " [LOCKED]" : isPaused ? " [PAUSED]" : "")}</span>
                </div>
            </Html>
            {(isLocked || isForced) && (
                <Line points={[[0,0,0], [-position[0], -position[1], -position[2]]]} color={isForced ? seizureColor : (isOverride ? "red" : "#10b981")} lineWidth={isForced ? 3 : 2} dashed />
            )}
        </group>
    );
};