import React from 'react';
import { Radar } from './radar';
import { TerminalLog } from './TerminalLog';
import { AgentTacticalPanel } from './AgentTacticalPanel';
import { QueueDisplay } from './QueueDisplay';
import clsx from 'clsx';
import { useATC } from '../hooks/useATC';

export const Dashboard = () => {
  const { state, isDark, viewMode } = useATC();

  return (
    <main className="flex-1 min-w-0 w-0 relative flex flex-col overflow-hidden">
      {/* Top Bar / Status */}
      <div className="absolute top-4 left-6 z-20 pointer-events-none select-none">
        <h1 className={clsx("text-4xl font-black tracking-tighter uppercase opacity-30", 
          isDark ? "text-white" : "text-slate-900"
        )}>
          ATC // <span className="text-red-500">TRAFFIC</span>
        </h1>
        <div className="flex items-center gap-3 mt-1 opacity-60 font-mono text-xs">
          <span className={clsx("w-2 h-2 rounded-full animate-pulse", 
            state.overrideSignal ? "bg-red-500" : "bg-emerald-500"
          )}></span>
          <span>SYSTEM: {state.overrideSignal ? "OVERRIDE ACTIVE" : "NOMINAL"}</span>
          <span>|</span>
          <span>LATENCY: {state.latency}ms</span>
        </div>
      </div>

      {/* Radar View Area */}
      {viewMode === 'detached' ? (
        <div className="flex-1 w-full h-full relative">
          <Radar isMainView={true} />
          
          {/* Overlay Instructions */}
          <div className="absolute top-4 right-6 text-right pointer-events-none opacity-40 font-mono text-xs z-10">
            <p>[R-Click] PAN</p>
            <p>[Scroll] ZOOM</p>
            <p>[L-Click] ROTATE</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center opacity-20 font-mono text-sm">
          Waiting for Radar Detachment...
        </div>
      )}

      {/* Floating Panels */}
      <TerminalLog />
      <QueueDisplay />
      <AgentTacticalPanel />
    </main>
  );
};