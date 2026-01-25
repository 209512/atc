import { motion } from 'framer-motion';
import { Activity, Lock, Unlock, Zap, Shield } from 'lucide-react';

export const Metrics = ({ state }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg mt-8">
      <div className="col-span-1 md:col-span-3 text-center mb-2 font-mono text-sm tracking-widest animate-pulse">
        {state.overrideSignal || state.holder?.includes('Human') ? (
           <span className="text-red-500 font-bold">EMERGENCY: Admin in Control</span>
        ) : (
           <span className="text-atc-blue">AI Managing Traffic</span>
        )}
      </div>

      <MetricCard 
        label="Current Controller" 
        value={state.holder || 'Idle'} 
        color={state.holder?.includes('Human') ? 'text-atc-blue' : (state.holder ? 'text-atc-purple' : 'text-gray-500')}
        icon={<Lock className="w-4 h-4" />}
      />
      <MetricCard 
        label="Engine Latency" 
        value={`${state.latency}ms`} 
        color="text-atc-orange"
        icon={<Activity className="w-4 h-4" />}
      />
      <MetricCard 
        label="Collisions" 
        value={state.collisionCount} 
        color="text-atc-red"
        icon={<Zap className="w-4 h-4" />}
      />
    </div>
  );
};

const MetricCard = ({ label, value, color, icon }) => (
  <div className="bg-github-border/20 border border-github-border p-4 rounded-xl backdrop-blur-sm">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-1">
      {icon}
      {label}
    </div>
    <div className={`text-xl font-mono font-bold ${color}`}>
      {value}
    </div>
  </div>
);
