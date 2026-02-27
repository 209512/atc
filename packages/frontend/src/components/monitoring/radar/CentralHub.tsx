// src/components/monitoring/radar/CentralHub.tsx
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import clsx from 'clsx';
import { Agent } from '@/contexts/atcTypes';

interface CentralHubProps {
  isLocked: boolean;
  isOverride: boolean;
  holder: string | null;
  isDark: boolean;
  agents: Agent[];
}

export const CentralHub = ({ isLocked, isOverride, holder, isDark, agents }: CentralHubProps) => {
    const ref = useRef<any>(null!);
    
    const holderDisplayName = useMemo(() => {
        if (!holder) return null;
        if (holder === 'Human-Operator') return 'HUMAN';
        const agent = agents.find(a => a.id === holder);
        return agent?.displayId || agent?.id || holder.split('-')[0];
    }, [holder, agents]);

    useFrame(() => {
        if(ref.current) {
            ref.current.rotation.y -= 0.01;
            ref.current.rotation.z += 0.005;
        }
    });

    return (
        <group ref={ref}>
            <mesh>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial 
                    color={isOverride ? "#ef4444" : (isLocked ? "#10b981" : "#3b82f6")}
                    wireframe
                    emissive={isOverride ? "#ef4444" : (isLocked ? "#10b981" : "#3b82f6")}
                    emissiveIntensity={0.5}
                />
            </mesh>
            <Html position={[0, 0, 0]} center>
                <div className={clsx(
                    "text-[8px] font-mono text-center pointer-events-none select-none",
                    isDark ? "text-white" : "text-black"
                )}>
                    <div className="font-bold tracking-widest opacity-50">CORE</div>
                    {holderDisplayName && (
                        <div className={clsx(
                            "text-[7px] mt-1 px-1 rounded font-bold animate-pulse whitespace-nowrap",
                            isOverride ? "text-red-500" : "text-emerald-500"
                        )}>
                            {isOverride ? 'OVERRIDE' : holderDisplayName}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
};