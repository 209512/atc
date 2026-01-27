import React, { useState } from 'react';
import clsx from 'clsx';
import { useATC } from '../context/ATCContext';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
    delay?: number;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
    children, 
    content, 
    position = 'top', 
    delay = 200,
    className
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const { isDark } = useATC();
    const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

    const show = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
        'bottom-left': 'top-full right-0 mt-2', // Aligns right edge to right edge of parent
        'bottom-right': 'top-full left-0 mt-2'
    };

    return (
        <div className={clsx("relative inline-block", className)} onMouseEnter={show} onMouseLeave={hide}>
            {children}
            {isVisible && (
                <div className={clsx(
                    "absolute z-[10000] px-2 py-1 text-[10px] font-mono rounded whitespace-nowrap pointer-events-none transition-opacity backdrop-blur-sm",
                    positionClasses[position],
                    isDark ? "bg-white/90 text-black" : "bg-black/80 text-white",
                    "shadow-lg"
                )}>
                    {content}
                    {/* Arrow - Only for standard positions for now */}
                    {['top', 'bottom', 'left', 'right'].includes(position) && (
                        <div className={clsx(
                            "absolute w-2 h-2 rotate-45",
                            isDark ? "bg-white" : "bg-black",
                            position === 'top' && "top-full left-1/2 -translate-x-1/2 -mt-1",
                            position === 'bottom' && "bottom-full left-1/2 -translate-x-1/2 -mb-1",
                            position === 'left' && "left-full top-1/2 -translate-y-1/2 -ml-1",
                            position === 'right' && "right-full top-1/2 -translate-y-1/2 -mr-1"
                        )} />
                    )}
                </div>
            )}
        </div>
    );
};
