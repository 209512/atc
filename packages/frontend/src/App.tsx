import { Toaster } from 'sonner';
import { useATC } from './hooks/useATC';
import { Sidebar } from './components/Sidebar';
import { TerminalLog } from './components/TerminalLog';
import { Radar } from './components/Radar';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Maximize2, Minimize2 } from 'lucide-react';

function App() {
  const { state, triggerOverride, releaseLock, setTrafficIntensity } = useATC();
  const [isDark, setIsDark] = useState(true);
  
  // View Mode: 'standard' (Sidebar) vs 'detached' (Main Area)
  const [viewMode, setViewMode] = useState('standard'); 
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  
  // Lifted Audio State
  const [isAdminMuted, setIsAdminMuted] = useState(false); // SYS sounds
  const [isAgentMuted, setIsAgentMuted] = useState(false); // NET sounds

  // Shared Sidebar Width State
  const [sidebarWidth, setSidebarWidth] = useState(450);

  // Global Key Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (state.holder?.includes('Human')) {
                releaseLock();
            } else {
                triggerOverride();
            }
        }

        if (e.code === 'Escape') {
             if (state.holder?.includes('Human')) {
                 releaseLock();
             }
             setSelectedAgentId(null);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.holder, triggerOverride, releaseLock]);

  const [agents, setAgents] = useState([]);

  // Fetch logic
  useEffect(() => {
    const fetchStatus = async () => {
        try {
          const API_URL = "http://localhost:3000"; 
          
          const res = await fetch(`${API_URL}/api/agents/status`);
          const data = await res.json();
          setAgents(prevAgents => {
             const dataMap = new Map(data.map(a => [a.id, a]));
             const newAgentList = prevAgents.map(prev => {
                 const newData = dataMap.get(prev.id);
                 return newData ? newData : prev; 
             }).filter(a => dataMap.has(a.id)); 
             
             const currentIds = new Set(prevAgents.map(a => a.id));
             data.forEach(a => {
                 if (!currentIds.has(a.id)) {
                     newAgentList.push(a);
                 }
             });
             
             return newAgentList; 
          });
          
          if (agents.length === 0 && data.length > 0) {
               setAgents(data.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true})));
          }

        } catch (e) {}
    };
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []); 

  return (
    <div className={clsx("min-h-screen font-sans flex overflow-hidden relative transition-colors duration-500 min-w-0", isDark ? "bg-[#05090a] text-gray-300" : "bg-[#f8fafc] text-slate-800")}>
      <Toaster position="top-center" theme={isDark ? "dark" : "light"} />
      
      {/* Main Area */}
      <main className="flex-1 min-w-0 w-0 relative flex flex-col overflow-hidden">
          
          {/* Background Ambience (Always visible in standard, or behind radar in detached) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className={clsx("absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] transition-colors duration-500", isDark ? "bg-cyan-500/5" : "bg-blue-500/5")} />
              <div className={clsx("absolute bottom-[-20%] right-[20%] w-[40%] h-[40%] rounded-full blur-[150px] transition-colors duration-500", isDark ? "bg-purple-500/5" : "bg-purple-500/5")} />
          </div>

          {viewMode === 'detached' ? (
              // Detached Radar: Occupies the Main area, sitting above the background
              <div className={clsx("absolute inset-0 z-10 w-full h-full", isDark ? "bg-[#05090a]" : "bg-[#f8fafc]")}>
                  <Radar 
                    state={state} 
                    agents={agents} 
                    isDark={isDark} 
                    onAgentClick={setSelectedAgentId}
                    selectedAgentId={selectedAgentId}
                  />
                  {/* Detach Control Overlay */}
                  <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-4">
                      <button 
                        onClick={() => setViewMode('standard')}
                        className={clsx("p-3 rounded-full shadow-xl backdrop-blur-md border transition-all hover:scale-110", 
                            isDark ? "bg-black/50 border-white/20 text-white" : "bg-white/50 border-black/10 text-black"
                        )}
                      >
                          <Minimize2 className="w-6 h-6" />
                      </button>
                      
                      {/* Controls Instruction */}
                      <div className={clsx("p-4 rounded-xl backdrop-blur-md border text-xs font-mono space-y-1 text-right shadow-2xl pointer-events-none select-none",
                          isDark ? "bg-black/40 border-white/10 text-gray-400" : "bg-white/40 border-black/10 text-slate-600"
                      )}>
                          <div><span className="font-bold">R-CLICK + DRAG</span> to PAN</div>
                          <div><span className="font-bold">L-CLICK + DRAG</span> to ROTATE</div>
                          <div><span className="font-bold">SCROLL</span> to ZOOM</div>
                      </div>
                  </div>
              </div>
          ) : (
            // Standard View Title
            <div className="flex-1 flex flex-col items-center justify-center z-10 text-center space-y-4 select-none pointer-events-none">
                <h1 className={clsx("text-6xl font-black tracking-tighter transition-colors duration-500", isDark ? "text-white/10" : "text-slate-900/10")}>ATC CORE</h1>
                <p className={clsx("font-mono text-sm tracking-[0.5em] opacity-30", isDark ? "text-gray-400" : "text-slate-500")}>SYSTEM VISUALIZATION</p>
            </div>
          )}

          {/* Floating Terminal Log - Z-Index 40 to stay above Radar */}
          <TerminalLog 
            state={state} 
            agents={agents}
            isDark={isDark} 
            isAdminMuted={isAdminMuted} 
            isAgentMuted={isAgentMuted}
            sidebarWidth={sidebarWidth}
          />
      </main>

      {/* Right Control Sidebar - Z-Index 50 (Highest priority) */}
      <Sidebar 
        state={state}
        triggerOverride={triggerOverride}
        releaseLock={releaseLock}
        setTrafficIntensity={setTrafficIntensity}
        isDark={isDark}
        setIsDark={setIsDark}
        agents={agents} 
        setAgents={setAgents}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedAgentId={selectedAgentId}
        setSelectedAgentId={setSelectedAgentId}
        // Audio Control Props
        isAdminMuted={isAdminMuted}
        setIsAdminMuted={setIsAdminMuted}
        isAgentMuted={isAgentMuted}
        setIsAgentMuted={setIsAgentMuted}
        // Width Control
        width={sidebarWidth}
        setWidth={setSidebarWidth}
      />
    </div>
  );
}

export default App;
