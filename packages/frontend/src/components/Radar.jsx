import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import clsx from 'clsx';
import { useATC } from '../context/ATCContext';
import { X } from 'lucide-react';

const CentralHub = ({ isLocked, isOverride, holder, isDark }) => {
    const ref = useRef();
    useFrame((state) => {
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

// ... (Subcomponents remain largely same, but can use useATC if needed, but props are cleaner for sub-renderers)
// Actually, Radar component receives props in original. Now it should use context.

const AgentDrone = ({ id, position, isLocked, isOverride, color, isDark, onClick, isSelected, isPaused }) => {
    const mesh = useRef();
    const textureRef = useRef();
    
    // Load texture if needed, but for now we manipulate material props
    
    useFrame((state) => {
        if (mesh.current) {
            // Stop rotation if paused
            if (!isPaused) {
                mesh.current.rotation.y += 0.02;
                // Float effect
                mesh.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
            }
            
            // Pulse scale on selection
            if (isSelected) {
                const s = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
                mesh.current.scale.set(s, s, s);
            } else {
                mesh.current.scale.set(1, 1, 1);
            }
        }
    });

    // Determine colors based on state
    const coreColor = isOverride ? '#ef4444' : (isPaused ? '#374151' : (isLocked ? '#10b981' : color)); // Paused: Dark Gray
    const emissiveColor = isOverride ? '#ef4444' : (isLocked ? '#10b981' : (isPaused ? '#000000' : color)); // Paused: No emission (Black)
    const emissiveIntensity = isLocked || isOverride ? 2 : (isSelected ? 1 : (isPaused ? 0 : 0.5));

    return (
        <group position={position} ref={mesh} onClick={(e) => { 
            e.stopPropagation(); 
            console.log(`[RADAR] Drone Clicked: ${id}`); 
            onClick(id); 
        }}>
            {/* Core */}
            <mesh>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial 
                    color={coreColor}
                    emissive={emissiveColor}
                    emissiveIntensity={emissiveIntensity}
                    wireframe={true}
                />
            </mesh>
            {/* Shell - Make it faint gray when paused */}
            <mesh scale={[1.2, 1.2, 1.2]}>
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial 
                    color={isPaused ? "#4b5563" : (isDark ? "white" : "black")} 
                    transparent 
                    opacity={isPaused ? 0.05 : 0.1} 
                    wireframe
                />
            </mesh>
            
            {/* Label Overlay - Dim when paused */}
            <Html position={[0, 0.8, 0]} center distanceFactor={10} zIndexRange={[50, 0]}>
                <div className={clsx(
                    "px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap border backdrop-blur-sm transition-all",
                    isOverride 
                        ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" 
                        : (isPaused 
                            ? "bg-gray-800/50 border-gray-700 text-gray-500" 
                            : (isLocked 
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 scale-110 font-bold" 
                                : (isDark ? "bg-black/40 border-white/20 text-white/70" : "bg-white/60 border-black/10 text-black/70")))
                )}>
                    {id}
                    {isLocked && " [LOCKED]"}
                    {isPaused && " [PAUSED]"}
                </div>
            </Html>

            {/* Connection Line to Center if Locked */}
            {isLocked && (
                <Line 
                    points={[[0,0,0], [-position[0], -position[1], -position[2]]]} // Relative to group, so target is -pos
                    color={isOverride ? "red" : "#10b981"}
                    lineWidth={2}
                    dashed
                    dashScale={5}
                />
            )}
        </group>
    );
};

const AgentDetailPopup = ({ agent, onClose, isDark, onTerminate }) => {
    if (!agent) return null;
    return (
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[99999, 0]}>
             <div 
                className={clsx(
                    "absolute top-4 right-4 w-56 p-3 rounded-lg border shadow-2xl backdrop-blur-md pointer-events-auto z-[99999]",
                    isDark ? "bg-black/90 border-gray-700 text-gray-300" : "bg-white/90 border-slate-300 text-slate-700"
                )}
                style={{ transform: 'translate(140px, -50px)' }} 
            >
                <div className="flex justify-between items-start mb-2 border-b pb-2 border-gray-500/30">
                    <div className="font-bold text-sm font-mono text-blue-500">{agent.id}</div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded hover:text-red-500 transition-colors"><X size={16} /></button>
                </div>
                <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between"><span>STATUS:</span> <span className={agent.status === 'paused' ? 'text-yellow-500' : 'text-emerald-500'}>{agent.status.toUpperCase()}</span></div>
                    <div className="flex justify-between"><span>PRIORITY:</span> <span>{agent.priority || 'NORMAL'}</span></div>
                    <div className="flex justify-between"><span>RESOURCE:</span> <span className="truncate max-w-[100px]">{agent.resource || 'NONE'}</span></div>
                    <div className="flex justify-between"><span>LATENCY:</span> <span>{Math.floor(Math.random() * 50 + 10)}ms</span></div>
                </div>
                 <button 
                    onClick={() => onTerminate(agent.id)}
                    className="w-full mt-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-1 rounded text-xs border border-red-500/30"
                >
                    TERMINATE LINK
                </button>
            </div>
        </Html>
    );
};

// Particles / Space Dust
const LightModeDust = ({ isDark }) => {
    const count = 4000;
    const [positions, colors] = useMemo(() => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();
      
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
        
        if (isDark) {
            color.setHex(0xffffff); // Star white
        } else {
            color.setHex(0x0f172a); // Slate-900 (Ultra Dark for White Mode)
        }
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      return [positions, colors];
    }, [isDark]);
  
    return (
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isDark ? 0.1 : 0.15} // Larger particles in light mode
          vertexColors
          transparent
          opacity={isDark ? 0.8 : 0.9} // Higher opacity for light mode
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    );
  };

export const Radar = ({ compact = false, isMainView = false }) => {
    const { state, agents, isDark, setSelectedAgentId, selectedAgentId, terminateAgent } = useATC();
    const { holder, overrideSignal, globalStop } = state;
    
    // Calculate Agent Positions based on ID hash or index
    const agentPositions = useMemo(() => {
        return agents.map((agent, i) => {
            const angle = (i / agents.length) * Math.PI * 2;
            const radius = 6;
            return {
                ...agent,
                pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]
            };
        });
    }, [agents]);

    return (
    <div className={clsx(
        "relative w-full h-full overflow-hidden transition-colors duration-500 min-w-0",
        isDark ? "bg-[#050505]" : "bg-[#f8fafc]"
    )}>
            {/* Status Overlay */}
            {!compact && (
                <div className="absolute top-4 left-4 z-10 font-mono text-xs pointer-events-none">
                    <div className={clsx(isDark ? "text-gray-400" : "text-slate-500")}>ACTIVE LINKS: {agents.length}</div>
                    <div className={clsx(isDark ? "text-gray-400" : "text-slate-500")}>LOCK STATUS: 
                        <span className={clsx("ml-2 font-bold", holder ? "text-red-500" : "text-emerald-500")}>
                            {holder ? "LOCKED" : "OPEN"}
                        </span>
                    </div>
                </div>
            )}

            <Canvas camera={{ position: [0, 8, 12], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                
                {/* Dust / Stars */}
                <LightModeDust isDark={isDark} />

                {/* Central Hub */}
                <CentralHub 
                    isLocked={!!holder} 
                    isOverride={overrideSignal} 
                    holder={holder} 
                    isDark={isDark}
                />

                {/* Agents */}
                {agentPositions.map(agent => (
                    <AgentDrone 
                        key={agent.id}
                        id={agent.id}
                        position={agent.pos}
                        isLocked={holder === agent.id}
                        isOverride={overrideSignal}
                        color="#3b82f6"
                        isDark={isDark}
                        onClick={setSelectedAgentId}
                        isSelected={selectedAgentId === agent.id}
                        isPaused={agent.status === 'paused' || globalStop}
                    />
                ))}

                {/* Floating Detail Popup for Selected Agent */}
                {selectedAgentId && (
                    <AgentDetailPopup 
                        agent={agents.find(a => a.id === selectedAgentId)} 
                        onClose={() => setSelectedAgentId(null)}
                        isDark={isDark}
                        onTerminate={(id) => terminateAgent(id)}
                    />
                )}

                {/* Controls */}
                <OrbitControls 
                    enableZoom={true} 
                    enablePan={true} // Enabled panning
                    autoRotate={!holder} 
                    autoRotateSpeed={0.5} 
                    makeDefault // Important for allowing interaction when overlay is present
                />
            </Canvas>
        </div>
    );
};
