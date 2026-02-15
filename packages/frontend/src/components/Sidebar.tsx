import React from 'react';
import clsx from 'clsx';
import { AgentSettings } from './sidebar/AgentSettings';
import { SidebarAgentList } from './sidebar/AgentList';
import { SidebarSystemStats } from './sidebar/SystemStats';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarControlPanel } from './sidebar/SidebarControlPanel';
import { useATC } from '../hooks/useATC';
import { useSidebarResize } from '../hooks/useSidebarResize';

export const Sidebar = () => {
    const { sidebarWidth, setSidebarWidth: setWidth, isDark, toggleAdminMute, toggleAgentMute } = useATC();
    const [uptime, setUptime] = React.useState(0);
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const { sidebarRef, resizerRef, isResizing, handleMouseDown } = useSidebarResize(sidebarWidth, setWidth);

    // 시스템 가동 시간 타이머
    React.useEffect(() => {
        const timer = setInterval(() => setUptime(u => u + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatUptime = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    };

    return (
        <>
            {/* 리사이저 핸들 (파란 선) */}
            <div 
                ref={resizerRef}
                className={clsx(
                    "fixed top-0 bottom-0 z-[60] w-1 cursor-col-resize transition-colors",
                    isResizing ? "bg-blue-500" : "hover:bg-blue-500/50"
                )}
                style={{ right: sidebarWidth }}
                onMouseDown={handleMouseDown}
            />

            <aside 
                ref={sidebarRef}
                className={clsx(
                    "h-screen border-l flex flex-col transition-none shadow-2xl backdrop-blur-md z-50 pointer-events-auto relative shrink-0 overflow-hidden",
                    isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800"
                )}
                style={{ width: sidebarWidth }}
            >
                {/* 1. 헤더 (테마, 설정) */}
                <SidebarHeader onOpenSettings={() => setIsSettingsOpen(true)} />

                {/* 2. 컨트롤 패널 (오디오, 비상 제어) */}
                <SidebarControlPanel />

                {/* 3. 스크롤 가능 영역 (통계, 에이전트 리스트) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 min-w-0">
                    <SidebarSystemStats />
                    <SidebarAgentList />
                </div>

                {/* 4. 푸터 (상태 표시바) */}
                <div className={clsx(
                    "p-3 border-t text-[10px] font-mono flex justify-between items-center min-w-0 shrink-0",
                    isDark ? "border-gray-800 bg-[#0d1117] text-gray-600" : "border-slate-200 bg-white text-slate-400"
                )}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            ONLINE
                        </span>
                        <span>v2.4.0-RC</span>
                    </div>
                    <span className="min-w-0">UPTIME: {formatUptime(uptime)}</span>
                </div>
            </aside>

            {/* 별도 팝업 및 패널 */}
            {isSettingsOpen && <AgentSettings onClose={() => setIsSettingsOpen(false)} />}
        </>
    );
};