// src/components/layout/ControlTower.tsx
import React from 'react';
import { TerminalLog } from '@/components/monitoring/terminal/TerminalLog';
import { QueueDisplay } from '@/components/monitoring/queue/QueueDisplay';
import { TacticalPanel } from '@/components/command/TacticalPanel';
import { useUI } from '@/hooks/system/useUI';

export const ControlTower = () => {
    const { sidebarWidth } = useUI();

    return (
        <div 
            className="fixed top-0 left-0 pointer-events-none transition-all duration-300" 
            style={{ 
                zIndex: 40, // 사이드바(50)보다 낮게 설정
                width: `calc(100vw - ${sidebarWidth}px)`, 
                height: '100vh' 
            }}
        >
            <TerminalLog />
            <QueueDisplay />
            <TacticalPanel />
        </div>
    );
};