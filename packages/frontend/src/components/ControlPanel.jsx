import { motion } from 'framer-motion';
import { AlertTriangle, Fingerprint, RefreshCw } from 'lucide-react';

export const ControlPanel = ({ onOverride, onSimulate, onRelease, isHumanHeld }) => {
  return (
    <div className="flex flex-col gap-4 mt-8 w-full max-w-lg">
      <div className="flex gap-4">
        <button
          onClick={onSimulate}
          className="flex-1 bg-github-border/30 hover:bg-github-border/50 text-atc-purple border border-atc-purple/30 p-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw className="w-5 h-5" />
          Simulate AI Conflict
        </button>
      </div>

      {!isHumanHeld ? (
          <button
            onClick={onOverride}
            className="w-full bg-atc-blue/10 hover:bg-atc-blue/20 text-atc-blue border border-atc-blue/50 p-6 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(88,166,255,0.2)] hover:shadow-[0_0_30px_rgba(88,166,255,0.4)]"
          >
            <Fingerprint className="w-6 h-6" />
            MANUAL OVERRIDE
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
