// src/App.tsx
import React from 'react';
import clsx from 'clsx';
import { useUI } from '@/hooks/system/useUI';
import { Dashboard } from '@/components/layout/Dashboard';
import { SidebarContainer } from '@/components/layout/SidebarContainer';

const App = () => {
  const { isDark } = useUI();

  return (
    <div className={clsx(
      "h-screen w-screen font-sans flex overflow-hidden relative select-none", 
      isDark ? "bg-[#05090a] text-gray-300" : "bg-[#f1f5f9] text-slate-800"
    )}>
      <div className="flex-1 min-w-0 h-full relative overflow-hidden">
        <Dashboard />
      </div>
      
      {/* 사이드바는 HUD보다 낮은 순위 혹은 동일 순위로 설정 (z-50) */}
      <SidebarContainer />
    </div>
  );
};

export default App;