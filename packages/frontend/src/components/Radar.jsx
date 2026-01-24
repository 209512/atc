import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';
import clsx from 'clsx';

export const Radar = ({ state }) => {
  const { holder, collisionCount, overrideSignal, fencingToken } = state;
  const isHuman = holder === 'Human';
  const isCollision = collisionCount > 0; // In a real app we'd check delta, but for now just redness.
  
  // We can track collision count change to trigger flash
  
  return (
    <div className="relative flex items-center justify-center w-96 h-96">
      {/* Background Radar Rings */}
      <div className="absolute inset-0 rounded-full border border-github-border opacity-20 animate-pulse" />
      <div className="absolute inset-8 rounded-full border border-github-border opacity-30" />
      <div className="absolute inset-16 rounded-full border border-github-border opacity-40" />
      
      {/* Scanning Line */}
      <motion.div 
        className="absolute inset-0 rounded-full border-t-2 border-atc-blue opacity-50"
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-gradient-to-b from-atc-blue/50 to-transparent origin-bottom" />
      </motion.div>

      {/* Central Node (The Lock) */}
      <motion.div 
        className={clsx(
            "w-24 h-24 rounded-full flex items-center justify-center border-4 z-10 shadow-[0_0_30px_rgba(0,0,0,0.5)]",
            holder ? (isHuman ? "border-atc-blue bg-atc-blue/20" : "border-atc-purple bg-atc-purple/20") : "border-github-border bg-github-dark"
        )}
        animate={{ scale: holder ? [1, 1.1, 1] : 1 }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {holder ? (
            isHuman ? <ShieldCheck className="w-10 h-10 text-atc-blue" /> : <Cpu className="w-10 h-10 text-atc-purple" />
        ) : (
            <div className="w-4 h-4 rounded-full bg-github-border" />
        )}
      </motion.div>

      {/* Collision Flash Overlay */}
      {/* In a real implementation we would trigger this on state change. 
          For now, let's just make the container glow red if collisions are high/recent?
          We'll rely on the "status" text for collision count.
      */}
      
      {/* Orbiting Particles (Simulated Agents) */}
      {[0, 90, 180, 270].map((deg, i) => (
         <motion.div
           key={i}
           className="absolute w-full h-full"
           initial={{ rotate: deg }}
           animate={{ rotate: deg + 360 }}
           transition={{ duration: 8 + i, repeat: Infinity, ease: "linear" }}
         >
            <div className="absolute top-0 left-1/2 w-3 h-3 rounded-full bg-atc-purple shadow-lg shadow-atc-purple/50" />
         </motion.div>
      ))}

    </div>
  );
};
