import React from 'react'; 
import clsx from 'clsx';
import { Cpu, Radio } from 'lucide-react';
import { Radar } from '../radar';
import { Tooltip } from '../Tooltip';
import { useATC } from '../../hooks/useATC';

export const SidebarSystemStats = () => {
    const { state, setTrafficIntensity, isDark, viewMode, setViewMode } = useATC();
    const [sliderValue, setSliderValue] = React.useState(2);
    const [showRadar, setShowRadar] = React.useState(true);

    const minRequired = React.useMemo(() => {
        return Math.max(1, state.priorityAgents?.length || 0);
    }, [state.priorityAgents]);

    React.useEffect(() => {
        if (state.trafficIntensity !== undefined) {
            setSliderValue(state.trafficIntensity);
        }
    }, [state.trafficIntensity]);

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);

        if (val < minRequired) {
            setSliderValue(minRequired);
            setTrafficIntensity(minRequired);
        } else {
            setSliderValue(val);
            setTrafficIntensity(val);
        }
    };

    return (
        <div className="space-y-6 min-w-0">
            {/* System Congestion Section */}
            <div className="space-y-3 min-w-0">
                <div className="flex justify-between items-end min-w-0">
                    <label className={clsx("text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0", isDark ? "text-gray-400" : "text-slate-500")}>
                        <Cpu size={14} />
                        <Tooltip content="Current System Load" position="bottom">System Congestion</Tooltip>
                    </label>
                    <div className="flex flex-col items-end">
                        <span className={clsx("text-xs font-mono min-w-0", isDark ? "text-blue-400" : "text-blue-600")}>
                            {state.trafficIntensity || 0} / 10
                        </span>
                        {sliderValue === minRequired && minRequired > 1 && (
                            <span className="text-[7px] text-orange-500 font-bold uppercase animate-pulse leading-none mt-0.5">Priority Protected</span>
                        )}
                    </div>
                </div>
                <div className="relative pt-1 min-w-0">
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        step="1"
                        value={sliderValue}
                        onChange={handleSliderChange}
                        className={clsx(
                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500",
                            isDark ? "bg-gray-700" : "bg-gray-300"
                        )}
                    />

                    <div className={clsx("relative w-full px-1 flex justify-between text-[9px] font-mono mt-1 select-none min-w-0", isDark ? "text-gray-600" : "text-slate-400")}>
                        <span className="w-4 text-left">1</span>
                        <span className="absolute left-[44.4%] -translate-x-1/2 font-bold text-blue-500/60">5</span>
                        <span className="w-4 text-right">10</span>
                    </div>
                </div>
            </div>

            {/* Sector Scan Section */}
            <div className="space-y-3 min-w-0">
                <div className="flex justify-between items-center min-w-0">
                    <label className={clsx("text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0", isDark ? "text-gray-400" : "text-slate-500")}>
                        <Radio size={14} />
                        <Tooltip content="Live Sector Preview" position="bottom">Sector Scan</Tooltip>
                    </label>
                    
                    {/* View Mode 토글 버튼 */}
                    <Tooltip 
                        content={viewMode === 'attached' ? "Externalize View" : "Dock to Sidebar"} 
                        position="left"
                    >
                        <button 
                            onClick={() => setViewMode(viewMode === 'attached' ? 'detached' : 'attached')}
                            className={clsx("text-[10px] px-2 py-0.5 rounded border transition-colors min-w-0 font-bold", 
                                viewMode === 'detached' 
                                    ? (isDark ? "bg-blue-900/30 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-600")
                                    : (isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50")
                            )}
                        >
                            {viewMode === 'attached' ? 'DETACH VIEW' : 'ATTACH VIEW'}
                        </button>
                    </Tooltip>
                </div>

                {showRadar && (
                    <div className={clsx("h-48 rounded-lg overflow-hidden border relative min-w-0", isDark ? "border-gray-800 bg-black" : "border-slate-200 bg-slate-100")}>
                        <Radar compact={true} />
                        {viewMode === 'detached' && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-xs font-mono text-white/70">RADAR DETACHED</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};