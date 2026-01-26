import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Cpu } from 'lucide-react';
import clsx from 'clsx';

export const Radar = ({ state, agents }) => {
  const { holder, collisionCount, overrideSignal } = state;
  const isHuman = holder?.includes('Human');
  
  // Filter safe agent count
  const safeAgentCount = Math.max(0, state.activeAgentCount || 0);

  // Helper to find agent alias/name
  const getAgentName = (index) => {
      const defaultId = `Agent-${index + 1}`;
      // In a real scenario, we map this index to the actual agents array
      // But agents array might not be sorted or match indices 1:1 if deletions happened.
      // So we try to find the Nth agent in the list.
      if (agents && agents[index]) {
          return agents[index].id.replace('Agent-', 'A');
      }
      return `A${index + 1}`;
  };

  return (
    <div className="relative flex items-center justify-center w-96 h-96 bg-black/20 rounded-full overflow-hidden shadow-inner font-mono">
      {/* Admin Mode: Red Pulse Background */}
      <AnimatePresence>
          {isHuman && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-red-900/40 z-0 pointer-events-none"
            />
          )}
      </AnimatePresence>

      {/* Background Radar Rings */}
      {[0, 8, 16, 24, 32].map((inset, i) => (
          <div 
            key={i}
            className={clsx(
                "absolute rounded-full border opacity-30",
                isHuman ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-green-500/30 shadow-[0_0_5px_rgba(34,197,94,0.1)]"
            )}
            style={{ inset: `${inset * 4}px` }} 
          />
      ))}

      {/* Crosshairs */}
      <div className={clsx("absolute w-full h-px opacity-20", isHuman ? "bg-red-500" : "bg-green-500")} />
      <div className={clsx("absolute h-full w-px opacity-20", isHuman ? "bg-red-500" : "bg-green-500")} />
      
      {/* Scanning Line */}
      <motion.div 
        className={clsx(
            "absolute inset-0 rounded-full border-t-[3px] opacity-80",
            isHuman ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" : "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: isHuman ? 1.5 : 4, repeat: Infinity, ease: "linear" }}
      >
        <div className={clsx(
            "absolute top-0 left-1/2 w-1 h-1/2 origin-bottom bg-gradient-to-b to-transparent -translate-x-1/2",
            isHuman ? "from-red-500/80" : "from-green-400/50"
        )} />
      </motion.div>

      {/* Central Node (The Lock) */}
      <motion.div 
        className={clsx(
            "w-24 h-24 rounded-full flex items-center justify-center border-2 z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm",
            holder ? (isHuman ? "border-red-500 bg-red-950/80" : "border-green-500 bg-green-950/80") : "border-gray-700 bg-gray-900/80"
        )}
        animate={{ 
            scale: holder ? [1, 1.05, 1] : 1,
            boxShadow: isHuman ? "0 0 50px rgba(239,68,68,0.6)" : "0 0 30px rgba(34,197,94,0.3)"
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {holder ? (
            isHuman ? (
                <div className="flex flex-col items-center animate-pulse text-red-500">
                    <ShieldAlert className="w-8 h-8 mb-1" />
                    <span className="text-[9px] font-black tracking-widest">LOCKED</span>
                </div>
            ) : (
                <div className="flex flex-col items-center text-green-400">
                    <Cpu className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold tracking-widest truncate max-w-[80px]">
                        {holder.replace('Agent-', 'A')}
                    </span>
                </div>
            )
        ) : (
            <div className="w-2 h-2 rounded-full bg-gray-600" />
        )}
      </motion.div>

      {/* Active Lock Holder ID (Center Overlay) */}
      {holder && !isHuman && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 z-20">
              <span className="text-[10px] font-mono text-green-400 bg-black/50 px-1 rounded border border-green-500/30">
                  CTRL: {holder.replace('Agent-', 'A')}
              </span>
          </div>
      )}

      {/* Orbiting Particles (Simulated Agents) */}
      {agents && agents.map((agent, i) => {
         const deg = (360 / Math.max(1, agents.length)) * i;
         const isHolding = holder === agent.id;
         
         return (
            <motion.div
            key={agent.id}
            className="absolute w-full h-full pointer-events-none"
            initial={{ rotate: deg }}
            animate={{ 
                rotate: deg + 360,
                scale: isHolding ? 1.1 : 1 
            }}
            transition={{ duration: 12 + (i % 5), repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                     <div className={clsx(
                        "w-3 h-3 rounded-full shadow-lg transition-colors duration-300",
                        isHuman ? "bg-red-500/50 shadow-red-500/50" : (
                            isHolding ? "bg-green-400 shadow-green-400/50" : 
                            agent.status === 'WAITING' ? "bg-amber-400 shadow-amber-400/50" :
                            "bg-gray-400 shadow-gray-400/50"
                        )
                    )} />
                    {/* Agent Tag */}
                    <span className={clsx(
                        "text-[9px] font-bold opacity-70 truncate max-w-[60px]",
                        isHuman ? "text-red-400" : (isHolding ? "text-green-400" : "text-gray-400")
                    )}>
                        {agent.id.replace('Agent-', 'A')}
                    </span>
                </div>
            </motion.div>
         );
      })}
    </div>
  );
};
