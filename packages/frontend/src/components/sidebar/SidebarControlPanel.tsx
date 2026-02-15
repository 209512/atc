import React from 'react';
import clsx from 'clsx';
import { VolumeX, Speaker, Unlock, Lock } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { useATC } from '../../hooks/useATC';
import { useAudio } from '../../hooks/useAudio';

export const SidebarControlPanel = () => {
    const { 
        state, triggerOverride, releaseLock, isDark, 
        isAdminMuted, toggleAdminMute, markAction 
    } = useATC();
    
    const [isOverrideLoading, setIsOverrideLoading] = React.useState(false);
    const { playClick } = useAudio(isAdminMuted);
    
    const isHuman = (state.holder && state.holder.includes('Human')) || state.overrideSignal;
    
    const handleOverride = async () => {
        if (isOverrideLoading || isHuman) return;
        
        playClick();
        setIsOverrideLoading(true);
        markAction('', 'overrideSignal', true);
        
        try {
            await triggerOverride();
        } catch (e) {
            console.error("Override Failed", e);
            markAction('', 'overrideSignal', false); 
        } finally {
            setIsOverrideLoading(false);
        }
    };

    const handleRelease = async () => {
        playClick();
        markAction('', 'overrideSignal', false);

        try {
            await releaseLock();
        } catch (e) {
            console.error("Release Failed", e);
        }
    };

    const handleMuteToggle = () => {
        playClick();
        toggleAdminMute();
    };

    return (
        <div className={clsx(
            "p-2.5 border-b z-20 relative shrink-0 grid grid-cols-[auto_1fr] gap-1 h-20 items-center min-w-0",
            isDark ? "border-gray-800 bg-gray-900/50" : "border-slate-200 bg-slate-50/50"
        )}>
            {/* AUDIO CONTROL */}
            <div className="flex flex-col gap-1 min-w-0">
                <Tooltip content={isAdminMuted ? "Unmute All" : "Mute All"} position="bottom">
                    <button 
                        onClick={handleMuteToggle}
                        className={clsx(
                            "h-[60px] w-14 rounded flex flex-col items-center justify-center gap-1 transition-none border min-w-0",
                            isAdminMuted 
                                ? (isDark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-500")
                                : (isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-slate-300 hover:bg-slate-50 text-slate-600 shadow-sm")
                        )}
                    >
                        {isAdminMuted ? <VolumeX size={16} /> : <Speaker size={16} />}
                        <span className="text-[9px] font-bold">AUDIO</span>
                    </button>
                </Tooltip>
            </div>

            {/* OVERRIDE CONTROL */}
            <div className="flex items-center h-full min-w-0">
                {isHuman ? (
                    <button 
                        onClick={handleRelease} 
                        className="h-[60px] w-full rounded bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                    >
                        <Unlock size={16} />
                        <span>RELEASE LOCK</span>
                    </button>
                ) : (
                    <Tooltip content="Force Manual Control" position="bottom" className="w-full h-full">
                        <button 
                            onClick={handleOverride} 
                            disabled={isOverrideLoading} 
                            className={clsx(
                                "h-[60px] w-full rounded font-bold text-[10px] flex flex-col items-center justify-center gap-1 shadow-lg transition-all active:scale-95",
                                isOverrideLoading 
                                    ? "bg-gray-600 cursor-wait opacity-50"
                                    : "bg-red-500 hover:bg-red-600 text-white shadow-red-900/20"
                            )}
                        >
                            {isOverrideLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Lock size={16} />
                                    <span>EMERGENCY TAKEOVER</span>
                                </>
                            )}
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};