import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Fingerprint, RefreshCw } from 'lucide-react';

export const ControlPanel = ({ onOverride, onScale, onRelease, isHumanHeld, overrideSignal }) => {
  const [sliderValue, setSliderValue] = useState(2);

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    setSliderValue(val);
    onScale(val);
  };

  const [isOverrideLoading, setIsOverrideLoading] = useState(false);

  const handleOverride = async () => {
    setIsOverrideLoading(true);
    try {
        await onOverride();
    } finally {
        setIsOverrideLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-8 w-full max-w-lg">
      <div className="flex flex-col gap-2 p-4 border border-github-border rounded-xl bg-github-border/10">
        <label className="text-xs uppercase text-gray-500 font-bold flex justify-between items-center">
          <span>Traffic Intensity</span>
          <span className="bg-atc-purple/20 text-atc-purple px-2 py-0.5 rounded text-[10px] font-mono">
             TARGET: {sliderValue} AGENTS
          </span>
        </label>
        <input 
            type="range" 
            min="0" 
            max="10" 
            value={sliderValue}
            className="w-full accent-atc-purple cursor-pointer"
            onChange={handleSliderChange}
        />
        <div className="flex justify-between text-[10px] text-gray-600 font-mono">
            <span>0 (IDLE)</span>
            <span>5 (NORMAL)</span>
            <span>10 (CRITICAL)</span>
        </div>
      </div>

      {!isHumanHeld ? (
          <button
            onClick={handleOverride}
            disabled={overrideSignal || isOverrideLoading}
            className={`w-full bg-atc-blue/10 hover:bg-atc-blue/20 text-atc-blue border border-atc-blue/50 p-6 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(88,166,255,0.2)] hover:shadow-[0_0_30px_rgba(88,166,255,0.4)] ${overrideSignal || isOverrideLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            <Fingerprint className="w-6 h-6" />
            {overrideSignal || isOverrideLoading ? 'OVERRIDE IN PROGRESS...' : 'EMERGENCY TAKEOVER'}
          </button>
      ) : (
          <button
            onClick={onRelease}
            className="w-full bg-atc-green/10 hover:bg-atc-green/20 text-atc-green border border-atc-green/50 p-6 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95"
          >
            <Shield className="w-6 h-6" />
            RELEASE LOCK
          </button>
      )}
      
      <div className="text-center text-xs text-gray-600 mt-2">
        <AlertTriangle className="w-3 h-3 inline mr-1 text-atc-orange" />
        Force Unlock will administratively terminate active sessions.
      </div>
    </div>
  );
};

import { Shield } from 'lucide-react';
