import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Line, Text, Billboard, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

// --- Visual Constants (Clean Tactical) ---
const THEME = {
    dark: {
        bg: "#050505",      // Deep Space Black
        grid: "#1a1a1a",    // Subtle Grid
        coreFill: "#ffffff",
        agentFill: "#404040",
        lockedFill: "#00f3ff",
        adminFill: "#ef4444",
        text: "#eeeeee"
    },
    light: {
        bg: "#f8fafc",      // Slate-50
        grid: "#e2e8f0",    // Slate-200
        coreFill: "#0f172a",
        agentFill: "#94a3b8",
        lockedFill: "#2563eb",
        adminFill: "#dc2626",
        text: "#1e293b"
    }
};

// --- 3D Components ---

function CentralCore({ isLocked, isHuman, isDark }) {
    const meshRef = useRef();
    const colors = isDark ? THEME.dark : THEME.light;
    
    useFrame((state, delta) => {
        if (meshRef.current) {
            if (isHuman) {
                meshRef.current.rotation.y = 0;
                meshRef.current.rotation.x = 0;
                const scale = 1.0 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
                meshRef.current.scale.set(scale, scale, scale);
            } else {
                meshRef.current.rotation.y += delta * 0.2;
                meshRef.current.rotation.x += delta * 0.1;
                meshRef.current.scale.set(1, 1, 1);
            }
        }
    });

    const fillColor = isHuman ? colors.adminFill : colors.coreFill;

    return (
        <group>
            <mesh ref={meshRef} onClick={(e) => e.stopPropagation()}>
                <octahedronGeometry args={[1.2, 0]} />
                <meshBasicMaterial color={fillColor} />
            </mesh>
        </group>
    );
}

function DataParticles({ start, end, color }) {
    const count = 3; // Reduced count
    const speed = 1.5; // Slightly slower
    
    return (
        <group>
            {Array.from({ length: count }).map((_, i) => (
                <MovingParticle 
                    key={i} 
                    start={start} 
                    end={end} 
                    offset={i / count} 
                    speed={speed} 
                    color={color} 
                />
            ))}
        </group>
    );
}

function MovingParticle({ start, end, offset, speed, color }) {
    const ref = useRef();
    
    useFrame((state) => {
        if (ref.current) {
            const t = (state.clock.elapsedTime * speed + offset) % 1;
            ref.current.position.lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), t);
            
            // Smaller particles
            const s = Math.sin(t * Math.PI) * 0.08; 
            ref.current.scale.set(s, s, s);
        }
    });

    return (
        <mesh ref={ref}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={color} />
        </mesh>
    );
}

// ConnectionLine removed solid line, kept only particles
function ConnectionFlow({ start, end, color }) {
    return (
        <group>
            {/* Solid line removed as requested */}
            <DataParticles start={start} end={end} color={color} />
        </group>
    );
}

function AgentOrb({ agent, index, totalAgents, isHolder, isHuman, isDark, onSelect, isSelected }) {
    const meshRef = useRef();
    const colors = isDark ? THEME.dark : THEME.light;
    
    const radius = 6;
    const angleStep = (Math.PI * 2) / Math.max(1, totalAgents);
    const initialAngle = index * angleStep;
    
    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.elapsedTime;
            const orbitSpeed = 0.1; 
            const angle = initialAngle + time * orbitSpeed;
            
            const targetX = Math.cos(angle) * radius;
            const targetZ = Math.sin(angle) * radius;
            
            meshRef.current.position.x = targetX;
            meshRef.current.position.z = targetZ;
            meshRef.current.position.y = Math.sin(time + index) * 0.2; 
        }
    });

    let fillColor = colors.agentFill;
    if (isHuman) {
        fillColor = colors.adminFill;
    } else if (isHolder) {
        fillColor = colors.lockedFill;
    } else if (isSelected) {
        fillColor = isDark ? "#ffffff" : "#000000"; 
    }

    const scale = isHolder ? 0.45 : (isSelected ? 0.4 : 0.35); 

    return (
        <group>
            <mesh 
                ref={meshRef} 
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(agent.id);
                }}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { document.body.style.cursor = 'default'; }}
            >
                <sphereGeometry args={[scale, 32, 32]} />
                <meshBasicMaterial color={fillColor} />
                
                <Billboard position={[0, 0.7, 0]}>
                    <Text
                        fontSize={0.2}
                        color={isSelected ? fillColor : colors.text}
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        outlineWidth={0.02}
                        outlineColor={isDark ? "#000000" : "#ffffff"}
                    >
                        {agent.id.replace('Agent-', 'A')}
                    </Text>
                </Billboard>
            </mesh>
            
            {isHolder && (
                <ConnectionFlow 
                    start={[0,0,0]} 
                    end={meshRef.current ? meshRef.current.position : [0,0,0]} 
                    color={fillColor} 
                />
            )}
        </group>
    );
}

// --- Light Mode Dust (Custom Points) ---
function LightModeDust() {
    const ref = useRef();
    const count = 4000;
    
    // Generate random positions
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 150;
            pos[i*3+1] = (Math.random() - 0.5) * 150;
            pos[i*3+2] = (Math.random() - 0.5) * 150;
        }
        return pos;
    }, []);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.02;
            ref.current.rotation.x += delta * 0.01;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            {/* Reduced opacity and size for subtler effect */}
            <pointsMaterial size={0.4} color="#0f172a" transparent opacity={0.4} sizeAttenuation />
        </points>
    )
}

function Scene({ state, agents, isDark, onSelect, selectedAgentId }) {
    const { holder } = state;
    const isHuman = holder?.includes('Human');
    const colors = isDark ? THEME.dark : THEME.light;
    
    return (
        <>
            {isDark ? (
                <Stars radius={80} depth={20} count={2500} factor={4} saturation={0} fade speed={0.5} />
            ) : (
                <LightModeDust />
            )}
            <Grid 
                args={[40, 40]}  
                sectionSize={4} 
                sectionThickness={1} 
                sectionColor={colors.grid}
                cellSize={1} 
                cellThickness={0.5} 
                cellColor={colors.grid}
                fadeDistance={30}
                fadeStrength={1}
                position={[0, -2, 0]}
            />
            <CentralCore isLocked={!!holder} isHuman={isHuman} isDark={isDark} />
            {agents.map((agent, i) => (
                <AgentOrb 
                    key={agent.id} 
                    agent={agent} 
                    index={i} 
                    totalAgents={agents.length} 
                    isHolder={holder === agent.id}
                    isHuman={isHuman}
                    isDark={isDark}
                    onSelect={onSelect}
                    isSelected={selectedAgentId === agent.id}
                />
            ))}
            <OrbitControls 
                enableZoom={true} 
                enablePan={true} 
                autoRotate={false} 
                maxPolarAngle={Math.PI / 1.5} 
                minPolarAngle={0} 
                makeDefault
            />
        </>
    );
}

export const Radar = ({ state, agents, isDark = true, onAgentClick, selectedAgentId, compact = false }) => {
  const { holder } = state;
  const isHuman = holder?.includes('Human');
  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  
  return (
    <div className={clsx(
        "relative w-full h-full overflow-hidden transition-colors duration-500 min-w-0",
        isDark ? "bg-[#050505]" : "bg-[#f8fafc]"
    )}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[0, 10, 16]} fov={30} />
          <Scene state={state} agents={agents} isDark={isDark} onSelect={onAgentClick} selectedAgentId={selectedAgentId} />
      </Canvas>

      {/* Info Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
          <div className="flex flex-col gap-1">
              <AnimatePresence>
                  {holder && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={clsx(
                            "mt-1 font-bold font-mono tracking-wide",
                            compact ? "text-sm" : "text-lg", // Larger text in main view
                            isHuman 
                                ? "text-red-500" 
                                : (isDark ? "text-cyan-400" : "text-blue-600")
                        )}
                      >
                         [{isHuman ? "OVERRIDE" : "LOCKED"}] {holder.replace('Agent-', 'A')}
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      </div>

      {/* Agent Detail Overlay */}
      <AnimatePresence>
        {selectedAgent && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={clsx(
                    "absolute p-4 rounded-xl border backdrop-blur-md shadow-2xl overflow-hidden",
                    compact 
                        ? "top-1/2 left-4 -translate-y-1/2 w-[90%] max-w-[280px]" // Compact Mode: Left aligned
                        : "top-1/2 left-1/2 translate-x-12 -translate-y-1/2 min-w-[300px]",       // Standard Mode
                    isDark 
                        ? "bg-black/80 border-cyan-500/30 text-gray-200" 
                        : "bg-white/90 border-blue-500/30 text-slate-800"
                )}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="truncate pr-2">
                        <h3 className="text-lg font-bold font-mono tracking-tight truncate">{selectedAgent.id}</h3>
                        <span className={clsx("text-xs font-bold px-1.5 py-0.5 rounded inline-block", 
                            selectedAgent.status === 'PAUSED' ? "bg-amber-500/20 text-amber-500" : "bg-green-500/20 text-green-500"
                        )}>
                            {selectedAgent.status}
                        </span>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAgentClick(null); }}
                        className="opacity-50 hover:opacity-100 p-1"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono opacity-80">
                    <div>
                        <div className="opacity-50">LAST ACTIVE</div>
                        <div>{new Date(selectedAgent.lastActive).toLocaleTimeString()}</div>
                    </div>
                    <div>
                        <div className="opacity-50">PRIORITY</div>
                        <div>{selectedAgent.priority || 'NORMAL'}</div>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
