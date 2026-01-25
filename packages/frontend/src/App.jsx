import { Toaster } from 'sonner';
import { useATC } from './hooks/useATC';
import { Sidebar } from './components/Sidebar';
import { TerminalLog } from './components/TerminalLog';

function App() {
  const { state, triggerOverride, releaseLock, setTrafficIntensity } = useATC();

  return (
    <div className="min-h-screen bg-[#05090a] text-gray-300 font-sans flex overflow-hidden relative">
      <Toaster position="top-center" theme="dark" />
      
      {/* Main Empty Area (Left) */}
      <main className="flex-1 relative flex flex-col items-center justify-center">
          {/* Background Ambience */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-atc-blue/5 rounded-full blur-[150px]" />
            <div className="absolute bottom-[-20%] right-[20%] w-[40%] h-[40%] bg-atc-purple/5 rounded-full blur-[150px]" />
          </div>

          <div className="z-10 text-center space-y-4 select-none pointer-events-none">
              <h1 className="text-6xl font-black tracking-tighter text-white/10">ATC CORE</h1>
              <p className="font-mono text-sm tracking-[0.5em] opacity-30">SYSTEM VISUALIZATION</p>
          </div>

          {/* Floating Terminal Log */}
          <TerminalLog state={state} />
      </main>

      {/* Right Control Sidebar */}
      <Sidebar 
        state={state}
        triggerOverride={triggerOverride}
        releaseLock={releaseLock}
        setTrafficIntensity={setTrafficIntensity}
      />
    </div>
  );
}

export default App;