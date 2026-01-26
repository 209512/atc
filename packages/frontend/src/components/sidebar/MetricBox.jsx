import React from 'react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { Sparklines, SparklinesLine } from 'react-sparklines';

export const MetricBox = ({ label, value, isDark, color, showChart }) => {
    // Mock data for sparkline (random walk)
    const data = React.useMemo(() => Array.from({ length: 10 }, () => Math.floor(Math.random() * 20)), []);

    return (
        <div className={clsx("p-1.5 rounded border text-center flex flex-col items-center justify-center h-full w-full min-w-0 box-border relative overflow-hidden", isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-100 border-gray-200")}>
            <div className="text-[9px] opacity-60 font-bold mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis w-full z-10">{label}</div>
            <div className={clsx("font-mono font-bold text-[11px] truncate w-full px-1 z-10", color || (isDark ? "text-white" : "text-gray-900"))}>{value}</div>
            
            {showChart && (
                <div className="absolute inset-0 opacity-20 mt-4">
                    <Sparklines data={data} limit={10} width={100} height={30} margin={0}>
                        <SparklinesLine color={color ? "currentColor" : "#58A6FF"} style={{ strokeWidth: 2, fill: "none" }} />
                    </Sparklines>
                </div>
            )}
        </div>
    );
};

MetricBox.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    isDark: PropTypes.bool.isRequired,
    color: PropTypes.string,
    showChart: PropTypes.bool
};
