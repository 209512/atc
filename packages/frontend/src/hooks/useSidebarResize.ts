import React, { useState, useEffect, useRef } from 'react';

export const useSidebarResize = (initialWidth: number, setWidth: (w: number) => void) => {
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const resizerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
        if (sidebarRef.current) sidebarRef.current.style.transition = 'none';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            
            // 원래 로직: 마우스 위치에 따른 너비 계산
            const newWidth = window.innerWidth - e.clientX;

            // 실시간 DOM 조작 (사이드바와 핸들 동시 이동)
            if (sidebarRef.current) sidebarRef.current.style.width = `${newWidth}px`;
            if (resizerRef.current) resizerRef.current.style.right = `${newWidth}px`;
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (isResizing) {
                setIsResizing(false);
                const newWidth = window.innerWidth - e.clientX;
                setWidth(newWidth);
            }
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, setWidth]);

    return { sidebarRef, resizerRef, isResizing, handleMouseDown };
};