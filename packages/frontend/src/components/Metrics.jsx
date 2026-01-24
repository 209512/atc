import { motion } from 'framer-motion';
import { Activity, Lock, Unlock, Zap, Shield } from 'lucide-react';

export const Metrics = ({ state }) => {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8">
      <MetricCard 
        label="Holder" 
        value={state.holder || 'Idle'} 
        color={state.holder === 'Human' ? 'text-atc-blue' : (state.holder ? 'text-atc-purple' : 'text-gray-500')}
        icon={<Lock className="w-4 h-4" />}
      />
      <MetricCard 
        label="Fencing Token" 
        value={state.fencingToken ? `#${state.fencingToken.slice(0, 8)}...` : 'N/A'} 
        color="text-atc-green"
        icon={<Shield className="w-4 h-4" />}
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
