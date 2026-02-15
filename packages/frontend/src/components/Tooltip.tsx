import React, { useState, useContext, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ATCContext } from '../contexts/ATCProvider';

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
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    
    const context = useContext(ATCContext);
    const isDark = context?.isDark ?? true;
    const areTooltipsEnabled = context?.areTooltipsEnabled ?? true;

    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;

            // Viewport 기준 절대 위치 계산
            switch (position) {
                case 'top':
                    top = rect.top - 10;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 10;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 10;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 10;
                    break;
                case 'bottom-left':
                    top = rect.bottom + 10;
                    left = rect.right;
                    break;
                case 'bottom-right':
                    top = rect.bottom + 10;
                    left = rect.left;
                    break;
            }
            setCoords({ top, left });
        }
    };

    const show = () => {
        if (!areTooltipsEnabled || !content) return;
        updatePosition();
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const tooltipStyles: Record<string, string> = {
        top: '-translate-x-1/2 -translate-y-full',
        bottom: '-translate-x-1/2',
        left: '-translate-x-full -translate-y-1/2',
        right: '-translate-y-1/2',
        'bottom-left': '-translate-x-full',
        'bottom-right': '',
    };

    return (
        <div 
            ref={triggerRef} 
            className={clsx("relative inline-block", className)} 
            onMouseEnter={show} 
            onMouseLeave={hide}
            onMouseDown={hide}
        >
            {children}
            {isVisible && createPortal(
                <div 
                    className={clsx(
                        "fixed z-[999999] px-2 py-1 text-[10px] font-mono rounded whitespace-nowrap pointer-events-none backdrop-blur-md shadow-2xl border transition-opacity duration-150 animate-in fade-in zoom-in-95",
                        tooltipStyles[position],
                        isDark 
                            ? "bg-black/90 text-blue-400 border-blue-500/30" 
                            : "bg-white/95 text-slate-800 border-slate-200"
                    )}
                    style={{ 
                        top: coords.top, 
                        left: coords.left 
                    }}
                >
                    {content}
                </div>,
                document.body
            )}
        </div>
    );
};