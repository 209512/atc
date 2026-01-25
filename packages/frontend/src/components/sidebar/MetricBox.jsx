import React from 'react';
import clsx from 'clsx';

export const MetricBox = ({ label, value, isDark, color }) => (
    <div className={clsx("p-1.5 rounded border text-center flex flex-col items-center justify-center h-full w-full min-w-0 box-border", isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-100 border-gray-200")}>
        <div className="text-[9px] opacity-60 font-bold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full">{label}</div>
        <div className={clsx("font-mono font-bold text-[11px] truncate w-full px-1", color || (isDark ? "text-white" : "text-gray-900"))}>{value}</div>
    </div>
);
