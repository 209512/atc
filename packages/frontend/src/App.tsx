import React from 'react';
import clsx from 'clsx';
import { useATC } from './hooks/useATC';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';

const App = () => {
  const { isDark } = useATC();

  return (
    <div className={clsx(
      "min-h-screen font-sans flex overflow-hidden relative min-w-0", 
      isDark ? "bg-[#05090a] text-gray-300" : "bg-[#f8fafc] text-slate-800"
    )}>
      {/* 실제 메인 콘텐츠 영역 */}
      <Dashboard />
      
      {/* 우측 컨트롤 사이드바 */}
      <Sidebar />
    </div>
  );
};

export default App;