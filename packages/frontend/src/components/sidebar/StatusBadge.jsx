import React from 'react';
import clsx from 'clsx';

export const StatusBadge = ({ status }) => {
    const styles = { 
        ACTIVE: "bg-green-500/20 text-green-500", 
        WAITING: "bg-gray-500/20 text-gray-500", 
        PAUSED: "bg-yellow-500/20 text-yellow-500", 
        "GLOBAL STOP": "bg-red-500/20 text-red-500" 
    };
    return <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded", styles[status] || styles.WAITING)}>{status}</span>;
};
