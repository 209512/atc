import React from 'react';
import { Radar } from './components/Radar';
import { Sidebar } from './components/Sidebar';
import { TerminalLog } from './components/TerminalLog';
import { AgentTacticalPanel } from './components/AgentTacticalPanel'; // Import directly, no longer passed via Sidebar props
import clsx from 'clsx';
import { ATCProvider, useATC } from './context/ATCContext';

const Dashboard = () => {
  const { 
    state, 
    isDark, 
    viewMode, 
    sidebarWidth,
    // We don't need to pass other props anymore as components will consume them directly
  } = useATC();

  return (
    <div className={clsx("min-h-screen font-sans flex overflow-hidden relative min-w-0", isDark ? "bg-[#05090a] text-gray-300" : "bg-[#f8fafc] text-slate-800")}>
      
      {/* Main Area */}
      <main className="flex-1 min-w-0 w-0 relative flex flex-col overflow-hidden">
          {/* Top Bar / Status */}
          <div className="absolute top-4 left-6 z-20 pointer-events-none select-none">
             <h1 className={clsx("text-4xl font-black tracking-tighter uppercase opacity-30", isDark ? "text-white" : "text-slate-900")}>
                ATC // <span className="text-red-500">TRAFFIC</span>
             </h1>
             <div className="flex items-center gap-3 mt-1 opacity-60 font-mono text-xs">
                 <span className={clsx("w-2 h-2 rounded-full animate-pulse", state.overrideSignal ? "bg-red-500" : "bg-emerald-500")}></span>
                 <span>SYSTEM: {state.overrideSignal ? "OVERRIDE ACTIVE" : "NOMINAL"}</span>
                 <span>|</span>
                 <span>LATENCY: {state.latency}ms</span>
             </div>
          </div>

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

          {/* Floating Terminal Log - Z-Index 40 to stay above Radar */}
          <TerminalLog />
      </main>

      {/* Right Control Sidebar - Z-Index 50 (Highest priority) */}
      <Sidebar />
    </div>
  );
};

const App = () => {
  return (
    <ATCProvider>
      <Dashboard />
    </ATCProvider>
  );
};

export default App;
