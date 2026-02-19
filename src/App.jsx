import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Papa from "papaparse";

import { useKonami, KEY_LABELS } from "./hooks/useKonami";
import { useScheduleState, buildColorMap, formatCountdown } from "./hooks/useSchedule";
import ProgressBar from "./components/ProgressBar";
import DayTimeline from "./components/DayTimeline";
import ShortcutsModal from "./components/ShortcutsModal";

/* ── constants ── */
const KONAMI_SEQ = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a", "Enter"];
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const APP_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";

/* ── helpers ── */
function exportCSV(headers, schedule, title) {
  const rows = [headers.join(","), ...schedule.map((r) => headers.map((h) => `"${(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/\s+/g, "_")}.csv`;
  a.click();
}

/* ── TrafficLights ── */
const TrafficLights = React.memo(() => {
  const isOffline = window.isOfflineMode;
  return (
    <div className="flex gap-2 items-center" style={{ WebkitAppRegion: "no-drag" }}>
      {isOffline ? (
        <>
          <button className="w-5 h-5 border border-white flex items-center justify-center text-[10px] hover:bg-white hover:text-black transition-colors" onClick={() => window.electron?.close()}>X</button>
          <button className="w-5 h-5 border border-white flex items-center justify-center text-[10px] hover:bg-white hover:text-black transition-colors" onClick={() => window.electron?.minimize()}>_</button>
          <button className="w-5 h-5 border border-white flex items-center justify-center text-[10px] hover:bg-white hover:text-black transition-colors" onClick={() => window.electron?.maximize()}>[]</button>
        </>
      ) : (
        <>
          <button className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 active:opacity-60 transition-opacity" onClick={() => window.electron?.close()} title="Cerrar" />
          <button className="w-3 h-3 rounded-full bg-yellow-400 hover:opacity-80 active:opacity-60 transition-opacity" onClick={() => window.electron?.minimize()} title="Minimizar" />
          <button className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 active:opacity-60 transition-opacity" onClick={() => window.electron?.maximize()} title="Maximizar" />
        </>
      )}
    </div>
  );
});

/* ── KonamiDots ── */
const KonamiDots = React.memo(({ progress }) =>
  progress.length === 0 ? null : (
    <div className="flex gap-1 items-center flex-wrap max-w-[100px] mt-1">
      {progress.map((e, i) => (
        <div key={i} title={KEY_LABELS[e.key] ?? e.key} className={`w-2 h-2 rounded-full transition-all duration-200 ${e.correct ? "bg-green-400" : "bg-red-400"}`} />
      ))}
    </div>
  )
);

/* ── ScheduleTable ── */
const ScheduleTable = React.memo(({ schedule, headers, currentClass, todayColumn, colorMap, onCellClick, editingCell, onCellChange, onCellBlur, currentRowRef }) => {
  const isOffline = window.isOfflineMode;

  return (
    <div className={`flex-1 overflow-hidden transition-all duration-500 ${isOffline ? 'wireframe-border square' : 'rounded-2xl glass-premium'}`} style={{ WebkitAppRegion: "no-drag" }}>
      <div className="overflow-y-auto" style={{ maxHeight: "56vh" }}>
        <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              {headers.map((header, i) => {
                const isTodayCol = header === todayColumn;
                return (
                  <th key={i}
                    className={`p-3 font-semibold text-center text-sm transition-colors duration-300 ${isOffline ? 'wireframe-border wireframe-bg square' : 'text-white/80'}`}
                    style={{
                      position: "sticky", top: 0, zIndex: 10,
                      background: isOffline ? "black" : (isTodayCol ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)"),
                      borderBottom: isOffline ? "1px solid white" : "none",
                    }}>
                    {header}
                    {isTodayCol && <span className={isOffline ? "ml-1" : "ml-1 text-indigo-300 text-xs"}>{isOffline ? "(*)" : "●"}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody style={{ borderTop: isOffline ? '1px solid white' : 'none' }}>
            {schedule.map((row, i) => {
              const timeRange = row[headers[0]];
              const isCurrentSlot = currentClass && currentClass.timeRange === timeRange;

              return (
                <tr key={i} ref={isCurrentSlot ? currentRowRef : null} style={{ borderBottom: isOffline ? '1px solid white' : 'none' }}>
                  {headers.map((key, j) => {
                    const isActiveCell = isCurrentSlot && key === currentClass?.dayColumn;
                    const subject = (row[key] || "").trim();
                    const subjectBg = !isOffline && j > 0 && subject && !isActiveCell
                      ? colorMap[subject] ?? "rgba(255,255,255,0.02)"
                      : (isOffline ? "black" : undefined);

                    return (
                      <td key={`${i}-${j}`}
                        onClick={(e) => onCellClick(e, i, key)}
                        className={`p-3 text-center text-sm transition-all duration-300 cursor-default ${isOffline ? 'wireframe-border square' : `text-white ${isActiveCell ? "text-green-100 font-bold" : "text-white/90"}`}`}
                        style={{
                          background: isActiveCell ? (isOffline ? "white" : "rgba(74,222,128,0.25)") : subjectBg ?? (isOffline ? "black" : "rgba(255,255,255,0.02)"),
                          color: isActiveCell && isOffline ? "black" : "white",
                          border: isOffline ? "1px solid white" : "none"
                        }}>
                        {editingCell?.rowIndex === i && editingCell?.key === key ? (
                          <input value={row[key]} onChange={(e) => onCellChange(e.target.value)}
                            onBlur={onCellBlur} autoFocus
                            className="bg-transparent border-b border-white text-center outline-none w-full" />
                        ) : subject}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════ */
export default function HorarioApp() {
  /* ── core state ── */
  const [schedule, setSchedule] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingCell, setEditingCell] = useState(null);
  const [title, setTitle] = useState("Timely");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [clockShiftClicks, setClockShiftClicks] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [forceOffline, setForceOffline] = useState(false);

  const isEffectiveOffline = isOffline || forceOffline;
  window.isOfflineMode = isEffectiveOffline; // Global flag for sub-components

  /* ── UI toggles ── */
  const [showTimeline, setShowTimeline] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFocus, setShowFocus] = useState(false);

  /* ── debug ── */
  const [debugMode, setDebugMode] = useState(false);
  const [debugTime, setDebugTime] = useState("09:00");
  const [debugDay, setDebugDay] = useState(new Date().getDay());

  /* ── scroll-to-current ref ── */
  const currentRowRef = useRef(null);

  /* ── Konami → debug toggle ── */
  const toggleDebug = useCallback(() => setDebugMode((p) => !p), []);
  const { progress: konamiProgress } = useKonami(KONAMI_SEQ, toggleDebug);

  /* ── ? key → shortcuts, Esc → close ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "?" && !editingTitle && !editingCell) setShowShortcuts((p) => !p);
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowResetConfirm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingTitle, editingCell]);

  /* ── Timers & Intervals ── */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── localStorage ── */
  useEffect(() => {
    const s = localStorage.getItem("schedule");
    const h = localStorage.getItem("headers");
    const t = localStorage.getItem("title");
    if (s && h) { setSchedule(JSON.parse(s)); setHeaders(JSON.parse(h)); }
    if (t) setTitle(t);
  }, []);

  useEffect(() => {
    if (schedule.length && headers.length) {
      localStorage.setItem("schedule", JSON.stringify(schedule));
      localStorage.setItem("headers", JSON.stringify(headers));
    }
  }, [schedule, headers]);

  useEffect(() => { localStorage.setItem("title", title); }, [title]);

  /* ── clock ── */
  useEffect(() => {
    const id = setInterval(() => { if (!debugMode) setCurrentTime(new Date()); }, 1000);
    return () => clearInterval(id);
  }, [debugMode]);

  useEffect(() => {
    if (!debugMode) return;
    const [h, m] = debugTime.split(":").map(Number);
    const d = new Date();
    const diff = debugDay - d.getDay();
    d.setDate(d.getDate() + diff);
    d.setHours(h, m, 0, 0);
    setCurrentTime(d);
  }, [debugTime, debugDay, debugMode]);

  /* ── schedule logic ── */
  const scheduleState = useScheduleState(schedule, headers, currentTime);
  const { currentClass, nextClass, minutesUntilNext, classProgress, minutesRemaining, todayColumn } = scheduleState;

  /* ── color map (stable) ── */
  const colorMap = useMemo(() => buildColorMap(schedule, headers), [schedule, headers]);

  /* ── countdown label ── */
  const countdownLabel = useMemo(() => formatCountdown(minutesUntilNext), [minutesUntilNext]);

  const lastNotifiedClass = useRef(null);
  useEffect(() => {
    if (currentClass?.name && currentClass.name !== lastNotifiedClass.current) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Timely: Nueva Clase", {
          body: `Ahora: ${currentClass.name}${currentClass.timeRange ? ` (${currentClass.timeRange})` : ""}`,
          silent: false
        });
      }
      lastNotifiedClass.current = currentClass.name;
    }
  }, [currentClass]);

  /* ── liquid glass background ── */
  const gradientStyle = useMemo(() => {
    const h = currentTime.getHours();
    let baseColor1, baseColor2, accentColor1, accentColor2;

    if (h >= 5 && h < 8) {
      baseColor1 = "#0f172a"; baseColor2 = "#1e3a8a"; accentColor1 = "#60a5fa"; accentColor2 = "#3b82f6";
    } else if (h >= 8 && h < 12) {
      baseColor1 = "#1e40af"; baseColor2 = "#2563eb"; accentColor1 = "#93c5fd"; accentColor2 = "#60a5fa";
    } else if (h >= 12 && h < 16) {
      baseColor1 = "#1d4ed8"; baseColor2 = "#3b82f6"; accentColor1 = "#bfdbfe"; accentColor2 = "#93c5fd";
    } else if (h >= 16 && h < 19) {
      baseColor1 = "#1e3a8a"; baseColor2 = "#1e40af"; accentColor1 = "#3b82f6"; accentColor2 = "#2563eb";
    } else if (h >= 19 && h < 22) {
      baseColor1 = "#020617"; baseColor2 = "#0f172a"; accentColor1 = "#1e3a8a"; accentColor2 = "#0f172a";
    } else {
      baseColor1 = "#000814"; baseColor2 = "#020617"; accentColor1 = "#0f172a"; accentColor2 = "#020617";
    }

    return `
      radial-gradient(at 0% 0%, ${accentColor1} 0px, transparent 50%),
      radial-gradient(at 50% 0%, ${accentColor2} 0px, transparent 50%),
      radial-gradient(at 100% 0%, ${accentColor1} 0px, transparent 50%),
      radial-gradient(at 50% 50%, ${baseColor2} 0px, transparent 80%),
      radial-gradient(at 0% 100%, ${accentColor2} 0px, transparent 50%),
      radial-gradient(at 100% 100%, ${accentColor1} 0px, transparent 50%),
      ${baseColor1}
    `;
  }, [currentTime.getHours()]);

  /* ── auto-scroll ── */
  useEffect(() => {
    if (currentRowRef.current) {
      currentRowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentClass?.timeRange]);

  /* ── handlers ── */
  const handleFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: ({ meta, data }) => { setHeaders(meta.fields || []); setSchedule(data || []); },
    });
  }, []);

  const handleClockClick = useCallback((e) => {
    if (!e.shiftKey) return;
    setClockShiftClicks(c => {
      const n = c + 1;
      if (n >= 2) { setShowResetConfirm(true); return 0; }
      return n;
    });
  }, []);

  const handleReset = useCallback(() => {
    ["schedule", "headers", "title"].forEach((k) => localStorage.removeItem(k));
    setSchedule([]); setHeaders([]); setTitle("Timely");
    setShowResetConfirm(false);
  }, []);

  const handleCellClick = useCallback((e, rowIndex, key) => {
    if (e.shiftKey) setEditingCell({ rowIndex, key });
  }, []);

  const handleCellChange = useCallback((value) => {
    setSchedule(prev => prev.map((r, i) =>
      i === editingCell.rowIndex ? { ...r, [editingCell.key]: value } : r
    ));
  }, [editingCell]);

  /* ══════════ FIRST RUN ══════════ */
  if (!schedule.length || !headers.length) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-all duration-1000"
        style={{ background: isEffectiveOffline ? "#0a0a0a" : gradientStyle, fontFamily: APP_FONT, WebkitAppRegion: "drag", color: 'white' }}>

        {/* Offline CSS Fallback (only for when CDN fails) */}
        <style>{`
          .offline-fallback { background: rgba(0,0,0,0.6) !important; border: 1px solid rgba(255,255,255,0.1) !important; color: white !important; }
          .inline-card { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 1.5rem; }
        `}</style>

        <div className={`p-12 rounded-3xl shadow-2xl text-center inline-card ${isEffectiveOffline ? 'offline-fallback' : 'bg-white/20 border border-white/30'}`}
          style={{ WebkitAppRegion: "no-drag" }}>
          <div className="flex justify-start mb-6"><TrafficLights /></div>
          <h1 className="text-2xl font-semibold mb-2">Timely</h1>
          <p className="text-white/60 text-sm mb-8 opacity-70">Selecciona tu archivo CSV para comenzar</p>
          <label className="cursor-pointer group">
            <div className="border-2 border-dashed border-white/40 group-hover:border-white/70 transition-all rounded-2xl px-10 py-8 text-white/70 group-hover:text-white">
              <div className="text-4xl mb-3">📂</div>
              <div className="text-sm font-medium">Haz clic para seleccionar</div>
              <div className="text-xs opacity-60 mt-1">.csv</div>
            </div>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  /* ══════════ MAIN VIEW ══════════ */
  const cardBaseStyle = {
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: "1.5rem",
    border: "1px solid rgba(255,255,255,0.2)",
    background: isOffline ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.2)"
  };

  return (
    <div className={`min-h-screen p-10 transition-all duration-1000 ${isEffectiveOffline ? '' : 'liquid-bg'}`}
      style={{
        background: isEffectiveOffline ? "#0a0a0a" : gradientStyle,
        fontFamily: APP_FONT,
        WebkitAppRegion: "drag",
        color: 'white'
      }}>

      <style>{`
        /* Global Reset & Scrollbars */
        * { scrollbar-width: none !important; ms-overflow-style: none !important; }
        *::-webkit-scrollbar { display: none !important; }
        
        /* Liquid Glass Background Animation */
        @keyframes liquidFlow {
          0% { background-position: 0% 50%; opacity: 0.85; }
          50% { background-position: 100% 50%; opacity: 1; }
          100% { background-position: 0% 50%; opacity: 0.85; }
        }
        .liquid-bg {
          background-size: 200% 200% !important;
          animation: liquidFlow 15s ease-in-out infinite alternate !important;
        }

        /* Glass Refinement */
        .glass-premium {
          background: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            inset 0 0 0 1px rgba(255, 255, 255, 0.15),
            inset 0 0 20px 0 rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
        }

        /* Wireframe Theme */
        .wireframe-border { border: 1px solid white !important; }
        .wireframe-bg { background: black !important; }
        .wireframe-text { color: white !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
        .square { border-radius: 0 !important; }
      `}</style>

      {/* ── outer card ── */}
      <div className={`max-w-7xl mx-auto shadow-2xl transition-all duration-300 ${isEffectiveOffline ? 'wireframe-border wireframe-bg square p-6' : 'glass-premium rounded-3xl p-8'}`}>

        {/* ── HEADER ── */}
        <div className={`flex justify-between items-center mb-6 ${isEffectiveOffline ? 'wireframe-border p-3 mb-4' : ''}`}>
          <div className="flex flex-col gap-1 min-w-[60px]" style={{ WebkitAppRegion: "no-drag" }}>
            <TrafficLights />
            {konamiProgress.length > 0 && <KonamiDots progress={konamiProgress} />}
          </div>

          <div onClick={(e) => e.shiftKey && setEditingTitle(true)}
            className={`font-semibold select-none cursor-default text-center flex-1 mx-6 ${isEffectiveOffline ? 'text-xl uppercase tracking-widest' : 'text-3xl text-white'}`}
            style={{ WebkitAppRegion: "drag" }}>
            {editingTitle ? (
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)} autoFocus
                className="bg-transparent border-b border-white text-center outline-none w-full"
                style={{ WebkitAppRegion: "no-drag" }} />
            ) : (
              <span>
                {isEffectiveOffline ? `${title} - Offline` : title}
                {debugMode && <span className="ml-2 text-sm font-normal text-yellow-300/80">🐛 debug</span>}
                <button
                  onClick={() => setShowFocus(p => !p)}
                  className={`ml-3 text-xs p-1 px-2 border transition-all ${isEffectiveOffline ? 'wireframe-border square hover:bg-white hover:text-black' : 'rounded-lg border-white/10 hover:bg-white/10'}`}
                  style={{ WebkitAppRegion: "no-drag" }}
                  title={showFocus ? "Salir de Focus" : "Modo Focus"}
                >
                  {showFocus ? "✕ Salir Focus" : "🔭 Focus"}
                </button>
              </span>
            )}
          </div>

          <div className={`text-right group cursor-default min-w-[160px] ${isEffectiveOffline ? 'wireframe-text' : 'text-white'}`}
            style={{ WebkitAppRegion: "no-drag" }} onClick={handleClockClick}>
            <div className={`font-medium tabular-nums ${isEffectiveOffline ? 'text-lg' : 'text-xl'}`}>
              {currentTime.toLocaleTimeString("es-MX", { hour12: false, hour: "2-digit", minute: "2-digit" })}
            </div>
            {!isEffectiveOffline && (
              <div className="text-xs opacity-0 group-hover:opacity-50 transition duration-200 tabular-nums">
                :{String(currentTime.getSeconds()).padStart(2, "0")}
              </div>
            )}
            {currentClass && <div className={`text-xs mt-1 font-medium ${isEffectiveOffline ? '' : 'text-green-300'}`}>
              {isEffectiveOffline ? `> ${currentClass.name}` : `🟢 ${currentClass.name}`}
            </div>}
            <div className={`text-[10px] mt-0.5 ${isEffectiveOffline ? 'uppercase' : 'opacity-60'}`}>
              Próxima: {nextClass}
              {countdownLabel && nextClass !== "Sin clases restantes" && <span className="opacity-70"> ({countdownLabel})</span>}
            </div>

            {debugMode && (
              <div className="mt-3 flex flex-wrap gap-2 items-center justify-end">
                <div className="flex items-center gap-1.5 bg-white/5 border border-yellow-300/20 rounded-lg px-2 py-1">
                  <span className="text-xs text-yellow-300/60">⏱</span>
                  <input type="time" value={debugTime} onChange={(e) => setDebugTime(e.target.value)}
                    className="bg-transparent text-yellow-200 text-xs outline-none cursor-pointer"
                    style={{ WebkitAppRegion: "no-drag", colorScheme: "dark" }} />
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 border border-yellow-300/20 rounded-lg px-2 py-1">
                  <span className="text-xs text-yellow-300/60">📅</span>
                  <select value={debugDay} onChange={(e) => setDebugDay(Number(e.target.value))}
                    className="bg-transparent text-yellow-200 text-xs outline-none cursor-pointer"
                    style={{ WebkitAppRegion: "no-drag", colorScheme: "dark" }}>
                    {DAY_NAMES.map((n, i) => <option key={i} value={i} className="bg-slate-800 text-white">{n}</option>)}
                  </select>
                </div>
                <button onClick={() => setForceOffline(p => !p)}
                  className={`text-xs border rounded-lg px-2 py-1 transition-all ${forceOffline ? 'bg-red-500/40 border-red-400 text-red-100' : 'text-yellow-200/70 hover:text-yellow-200 bg-white/5 border-yellow-300/20 hover:border-yellow-300/50'}`}
                  style={{ WebkitAppRegion: "no-drag" }}>
                  {forceOffline ? '🔌 Volver Online' : '📶 Simular Offline'}
                </button>
                <button onClick={() => exportCSV(headers, schedule, title)}
                  className="text-xs text-yellow-200/70 hover:text-yellow-200 bg-white/5 border border-yellow-300/20 hover:border-yellow-300/50 rounded-lg px-2 py-1 transition-all"
                  style={{ WebkitAppRegion: "no-drag" }}>
                  ⬇ Exportar
                </button>
                <label className="cursor-pointer text-xs text-yellow-200/70 hover:text-yellow-200 bg-white/5 border border-yellow-300/20 hover:border-yellow-300/50 rounded-lg px-2 py-1 transition-all"
                  style={{ WebkitAppRegion: "no-drag" }}>
                  📂 Cambiar
                  <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>

        <ProgressBar progress={classProgress} minutesRemaining={minutesRemaining} />

        {showFocus ? (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
            <div className={`text-6xl font-bold mb-4 ${isEffectiveOffline ? '' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40'}`}>
              {currentClass ? currentClass.name : "Sin clases ahora"}
            </div>
            <div className={`text-xl mb-8 ${isEffectiveOffline ? '' : 'text-white/60'}`}>
              {currentClass ? currentClass.timeRange : "Relájate"}
            </div>
            <div className="w-full max-w-md">
              <ProgressBar progress={classProgress} minutesRemaining={minutesRemaining} />
            </div>
            {countdownLabel && <div className="mt-6 text-sm opacity-50 uppercase tracking-[0.2em]">{countdownLabel}</div>}
          </div>
        ) : (
          <div className="flex gap-4">
            <ScheduleTable
              schedule={schedule}
              headers={headers}
              currentClass={currentClass}
              todayColumn={todayColumn}
              colorMap={colorMap}
              onCellClick={handleCellClick}
              editingCell={editingCell}
              onCellChange={handleCellChange}
              onCellBlur={() => setEditingCell(null)}
              currentRowRef={currentRowRef}
            />

            {showTimeline && (
              <DayTimeline
                schedule={schedule}
                headers={headers}
                currentTime={currentTime}
                colorMap={colorMap}
                todayColumn={todayColumn}
                isOffline={isEffectiveOffline}
              />
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className={`flex items-center justify-between mt-5 pt-4 border-t ${isEffectiveOffline ? 'border-white' : 'border-white/10'}`}
          style={{ WebkitAppRegion: "no-drag" }}>
          <div className="flex gap-2">
            {!isEffectiveOffline && (
              <button onClick={() => setShowTimeline((p) => !p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${showTimeline ? "bg-white/15 border-white/25 text-white" : "bg-transparent border-white/10 text-white/40 hover:text-white/70"}`}>
                📋 Hoy
              </button>
            )}
            <button onClick={() => setShowShortcuts(true)}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${isEffectiveOffline ? 'wireframe-border square' : 'rounded-xl border-white/10 text-white/40 hover:text-white/70 hover:border-white/25'}`}>
              {isEffectiveOffline ? '[ ATAJOS ]' : '? Atajos'}
            </button>
          </div>

          <div className={`text-xs tabular-nums flex items-center gap-2 ${isEffectiveOffline ? 'wireframe-text uppercase italic' : 'text-white/40'}`}>
            {isEffectiveOffline && <span className="border border-white px-2 py-0.5 text-[10px] font-bold">OFFLINE MODE</span>}
            {currentTime.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </div>

          <div className="w-[80px]" />
        </div>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ WebkitAppRegion: "no-drag" }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl p-8 shadow-2xl text-center w-72">
            <div className="text-2xl mb-3">🗑️</div>
            <h2 className="text-white font-semibold text-lg mb-1">Resetear Timely</h2>
            <p className="text-white/60 text-sm mb-6">Se borrará tu horario y todos los datos guardados.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all">Cancelar</button>
              <button onClick={handleReset}
                className="px-5 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-all">Resetear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
