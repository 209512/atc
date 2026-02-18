// src/components/monitoring/radar/CentralHub.tsx
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import clsx from 'clsx';

interface CentralHubProps {
  isLocked: boolean;
  isOverride: boolean;
  holder: string | null;
  isDark: boolean;
}

export const CentralHub = ({ isLocked, isOverride, holder, isDark }: CentralHubProps) => {
    const ref = useRef<any>(null!);
    
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
                    "text-[8px] font-mono text-center pointer-events-none",
                    isDark ? "text-white" : "text-black"
                )}>
                    CORE
                    {holder && <div className="text-[6px] opacity-70">{holder}</div>}
                </div>
            </Html>
        </group>
    );
};