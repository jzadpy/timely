import React from "react";

/**
 * ProgressBar — shows how far through the current class we are.
 * progress: 0-1 float, or null (hidden)
 * minutesRemaining: number or null
 */
const ProgressBar = React.memo(function ProgressBar({ progress, minutesRemaining }) {
    if (progress === null || progress === undefined) return null;

    const pct = Math.round(progress * 100);

    return (
        <div className="mb-6 px-1">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-white/50 font-medium">Clase en curso</span>
                <span className="text-xs text-white/50 tabular-nums">
                    {minutesRemaining !== null
                        ? `${minutesRemaining} min restantes`
                        : `${pct}%`}
                </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                        width: `${pct}%`,
                        background: "linear-gradient(to right, rgba(74,222,128,0.8), rgba(34,197,94,0.9))",
                        boxShadow: "0 0 8px rgba(74,222,128,0.5)",
                        willChange: "width", // Informing browser about the width transition
                    }}
                />
            </div>
        </div>
    );
});

export default ProgressBar;
