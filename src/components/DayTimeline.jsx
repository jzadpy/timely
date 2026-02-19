import React from "react";
import { parseRange } from "../hooks/useSchedule";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * DayTimeline — vertical timeline of today's classes.
 * past = dimmed, current = glowing green, future = normal
 */
const DayTimeline = React.memo(function DayTimeline({ schedule, headers, currentTime, colorMap, todayColumn }) {
    if (!schedule.length || !headers.length || !todayColumn) return null;

    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const dayName = DAY_NAMES[currentTime.getDay()];

    return (
        <div
            className="flex flex-col gap-1 min-w-[160px] max-w-[180px]"
            style={{ WebkitAppRegion: "no-drag" }}
        >
            <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 text-center">
                {dayName}
            </div>
            <div
                className="overflow-y-auto flex flex-col gap-1 pr-1"
                style={{ maxHeight: "52vh", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {schedule.map((row, i) => {
                    const timeRange = row[headers[0]];
                    const range = parseRange(timeRange);
                    if (!range) return null;
                    const { startMin, endMin } = range;

                    const isCurrent =
                        startMin <= nowMin && (endMin === null || nowMin < endMin);
                    const isPast = endMin !== null && endMin <= nowMin;
                    const subject = row[todayColumn] || "—";
                    const subjectColor = colorMap[subject] ?? "rgba(255,255,255,0.08)";
                    const isWireframe = window.isOfflineMode;

                    return (
                        <div
                            key={i}
                            className={`px-3 py-2 text-xs transition-all duration-500 ${isWireframe ? 'wireframe-border square mb-1' : 'rounded-xl'}`}
                            style={{
                                background: isWireframe
                                    ? (isCurrent ? "white" : "black")
                                    : (isCurrent ? "rgba(74,222,128,0.18)" : isPast ? "rgba(255,255,255,0.04)" : subjectColor),
                                border: isWireframe
                                    ? "1px solid white"
                                    : (isCurrent ? "1px solid rgba(74,222,128,0.5)" : "1px solid rgba(255,255,255,0.08)"),
                                opacity: isPast ? 0.45 : 1,
                                boxShadow: isCurrent && !isWireframe ? "0 0 12px rgba(74,222,128,0.2)" : "none",
                                color: isWireframe && isCurrent ? "black" : "white"
                            }}
                        >
                            <div
                                className="font-medium truncate"
                                style={{ color: isWireframe && isCurrent ? "black" : (isCurrent ? "rgba(134,239,172,1)" : "rgba(255,255,255,0.85)") }}
                            >
                                {(isCurrent && !isWireframe) && <span className="mr-1">▶</span>}
                                {isWireframe && isCurrent ? `> ${subject}` : subject}
                            </div>
                            <div className={`${isWireframe && isCurrent ? 'text-black/60' : 'text-white/40'} mt-0.5 tabular-nums`}>{timeRange}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DayTimeline;
