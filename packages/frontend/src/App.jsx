import { Toaster } from 'sonner';
import { useATC } from './hooks/useATC';
import { Radar } from './components/Radar';
import { Metrics } from './components/Metrics';
import { ControlPanel } from './components/ControlPanel';

function App() {
  const { state, triggerOverride, releaseLock, simulateConflict } = useATC();

  return (
    <div className="min-h-screen bg-github-dark text-gray-300 font-sans flex flex-col items-center justify-center p-8 overflow-hidden relative">
      <Toaster position="top-center" theme="dark" />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-atc-blue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-atc-purple/5 rounded-full blur-[120px]" />
      </div>

      <header className="absolute top-8 left-8">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-atc-blue">ATC</span> 
          <span className="opacity-50 font-light">COMMAND CENTER</span>
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-atc-green animate-pulse" />
          <span className="text-xs uppercase tracking-widest opacity-60">System Online</span>
        </div>
      </header>

      <main className="z-10 flex flex-col items-center w-full max-w-4xl">
        <Radar state={state} />
        <Metrics state={state} />
        <ControlPanel 
            onOverride={triggerOverride} 
            onSimulate={simulateConflict} 
            onRelease={releaseLock}
            isHumanHeld={state.holder === 'Human'}
        />
      </main>

      <footer className="absolute bottom-4 text-xs opacity-30 font-mono">
        GEMINI-3-PRO // ATC-CORE v1.0.0
      </footer>
    </div>
  );
}

export default App;
