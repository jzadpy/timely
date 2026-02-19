import { useMemo } from "react";

/** Parse "HH:MM" → total minutes */
export function parseMinutes(str) {
    if (!str) return null;
    const [h, m] = str.trim().split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

/** Parse "HH:MM-HH:MM" → { startMin, endMin } */
export function parseRange(timeRange) {
    if (!timeRange) return null;
    const parts = timeRange.split("-");
    const startMin = parseMinutes(parts[0]);
    const endMin = parts[1] ? parseMinutes(parts[1]) : null;
    return { startMin, endMin };
}

/**
 * useScheduleState — derives current class, next class, progress, and per-day lists.
 */
export function useScheduleState(schedule, headers, currentTime) {
    return useMemo(() => {
        const empty = {
            currentClass: null,
            nextClass: "—",
            minutesUntilNext: null,
            classProgress: null, // 0-1
            minutesRemaining: null,
            todayColumn: null,
        };

        if (!schedule.length || !headers.length) return empty;

        const todayIndex = currentTime.getDay();
        const dayColumn = headers[todayIndex] ?? null;
        if (!dayColumn) return { ...empty, todayColumn: null };

        const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
        let current = null;
        let next = "Sin clases restantes";
        let minutesUntilNext = null;
        let foundNext = false;

        for (const row of schedule) {
            const range = parseRange(row[headers[0]]);
            if (!range) continue;
            const { startMin, endMin } = range;

            if (startMin <= nowMin && (endMin === null || nowMin < endMin)) {
                const duration = endMin !== null ? endMin - startMin : null;
                const elapsed = nowMin - startMin;
                current = {
                    name: row[dayColumn] || "—",
                    timeRange: row[headers[0]],
                    dayColumn,
                    startMin,
                    endMin,
                    progress: duration ? Math.min(elapsed / duration, 1) : null,
                    minutesRemaining: endMin !== null ? endMin - nowMin : null,
                };
            }

            if (!foundNext && startMin > nowMin) {
                next = row[dayColumn] || "—";
                minutesUntilNext = startMin - nowMin;
                foundNext = true;
            }
        }

        return {
            currentClass: current,
            nextClass: next,
            minutesUntilNext,
            classProgress: current?.progress ?? null,
            minutesRemaining: current?.minutesRemaining ?? null,
            todayColumn: dayColumn,
        };
    }, [schedule, headers, currentTime]);
}

/** Build a stable subject→color map from unique subject names */
export function buildColorMap(schedule, headers) {
    const PALETTE = [
        "rgba(139,92,246,0.35)",  // violet
        "rgba(59,130,246,0.35)",  // blue
        "rgba(16,185,129,0.35)",  // emerald
        "rgba(245,158,11,0.35)",  // amber
        "rgba(239,68,68,0.35)",   // red
        "rgba(236,72,153,0.35)",  // pink
        "rgba(20,184,166,0.35)",  // teal
        "rgba(249,115,22,0.35)",  // orange
        "rgba(99,102,241,0.35)",  // indigo
        "rgba(34,197,94,0.35)",   // green
    ];
    const map = {};
    let idx = 0;
    for (const row of schedule) {
        for (let i = 1; i < headers.length; i++) {
            const name = (row[headers[i]] || "").trim();
            if (name && !map[name]) {
                map[name] = PALETTE[idx % PALETTE.length];
                idx++;
            }
        }
    }
    return map;
}

/** Format minutes → human label */
export function formatCountdown(min) {
    if (min === null) return null;
    if (min < 1) return "menos de 1 min";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}
