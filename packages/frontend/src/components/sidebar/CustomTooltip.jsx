import React from 'react';
import clsx from 'clsx';

export const CustomTooltip = ({ children, text, fullWidth = false, position = "top", align = "center", shiftLeft = false }) => {
    const posClasses = {
        top: "bottom-full mb-2",
        bottom: "top-full mt-2",
        left: clsx(
            "right-full top-1/2 -translate-y-1/2",
            shiftLeft ? "translate-x-[230px] -translate-x-1/2" : "mr-2" 
        ),
        right: "left-full ml-2 top-1/2 -translate-y-1/2"
    };

    const alignClasses = {
        center: "left-1/2 -translate-x-1/2",
        right: "right-0 translate-x-0",
        left: "left-0 translate-x-0"
    };

    return (
        <div className={clsx("relative group", fullWidth ? "w-full block" : "inline-block")}>
            {children}
            <div className={clsx(
                "absolute opacity-0 group-hover:opacity-100 hidden group-hover:block px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap shadow-xl border border-gray-800 pointer-events-none",
                "z-[10000]",
                posClasses[position],
                (position === 'top' || position === 'bottom') && alignClasses[align]
            )}>
                {text}
                {align === 'center' && position === 'top' && <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />}
                {align === 'center' && position === 'bottom' && <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-black" />}
            </div>
        </div>
    );
};
