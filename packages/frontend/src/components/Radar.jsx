import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Cpu, Hexagon } from 'lucide-react';
import clsx from 'clsx';

export const Radar = ({ state }) => {
  const { holder, collisionCount, overrideSignal, fencingToken } = state;
  const isHuman = holder?.includes('Human');
  
  return (
    <div className="relative flex items-center justify-center w-96 h-96">
      {/* Flash Effect Overlay */}
      <AnimatePresence>
          {overrideSignal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full bg-red-500 z-0 pointer-events-none"
            />
          )}
      </AnimatePresence>

      {/* Background Radar Rings */}
      <div className="absolute inset-0 rounded-full border border-github-border opacity-20 animate-pulse" />
      <div className="absolute inset-8 rounded-full border border-github-border opacity-30" />
      <div className="absolute inset-16 rounded-full border border-github-border opacity-40" />
      
      {/* Scanning Line */}
      <motion.div 
        className={clsx(
            "absolute inset-0 rounded-full border-t-2 opacity-50",
            isHuman ? "border-red-500" : "border-atc-blue"
        )}
        animate={{ rotate: 360 }}
        transition={{ duration: isHuman ? 2 : 4, repeat: Infinity, ease: "linear" }}
      >
        <div className={clsx(
            "absolute top-0 left-1/2 w-0.5 h-1/2 origin-bottom bg-gradient-to-b to-transparent",
            isHuman ? "from-red-500/50" : "from-atc-blue/50"
        )} />
      </motion.div>

      {/* Central Node (The Lock) */}
      <motion.div 
        className={clsx(
            "w-24 h-24 rounded-full flex items-center justify-center border-4 z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-colors duration-500",
            holder ? (isHuman ? "border-red-500 bg-red-500/20" : "border-atc-blue bg-atc-blue/20") : "border-github-border bg-github-dark"
        )}
        animate={{ 
            scale: holder ? [1, 1.1, 1] : 1,
            boxShadow: isHuman ? "0 0 40px rgba(239,68,68,0.4)" : "0 0 20px rgba(56,189,248,0.2)"
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {holder ? (
            isHuman ? (
                <div className="flex flex-col items-center animate-pulse">
                    <ShieldAlert className="w-8 h-8 text-red-500 mb-1" />
                    <span className="text-[10px] font-black text-red-500 tracking-widest">ADM</span>
                </div>
            ) : (
                <div className="relative flex items-center justify-center">
                    <motion.div 
                        className="absolute inset-0 border-2 border-dashed border-atc-blue rounded-full w-12 h-12" 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                    <Cpu className="w-8 h-8 text-atc-blue relative z-10" />
                </div>
            )
        ) : (
            <div className="w-4 h-4 rounded-full bg-github-border" />
        )}
      </motion.div>

      {/* Orbiting Particles (Simulated Agents) */}
      {Array.from({ length: state.activeAgentCount || 2 }).map((_, i) => {
         // Distribute angles evenly based on count
         const count = state.activeAgentCount || 2;
         const deg = (360 / count) * i;
         return (
            <motion.div
            key={i}
            className="absolute w-full h-full"
            initial={{ rotate: deg }}
            animate={{ rotate: deg + 360 }}
            transition={{ duration: 8 + (i % 3), repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute top-0 left-1/2 w-3 h-3 rounded-full bg-atc-purple shadow-lg shadow-atc-purple/50" />
            </motion.div>
         );
      })}

    </div>
  );
};
