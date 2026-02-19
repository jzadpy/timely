import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";

/* ================= TRAFFIC LIGHTS ================= */
const TrafficLights = () => (
  <div className="flex gap-2 items-center" style={{ WebkitAppRegion: "no-drag" }}>
    <button
      className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 active:opacity-60 transition-opacity"
      onClick={() => window.electron?.close()}
      title="Cerrar"
    />
    <button
      className="w-3 h-3 rounded-full bg-yellow-400 hover:opacity-80 active:opacity-60 transition-opacity"
      onClick={() => window.electron?.minimize()}
      title="Minimizar"
    />
    <button
      className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 active:opacity-60 transition-opacity"
      onClick={() => window.electron?.maximize()}
      title="Maximizar"
    />
  </div>
);

export default function HorarioApp() {
  const [schedule, setSchedule] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingCell, setEditingCell] = useState(null);
  const [title, setTitle] = useState("Timely");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [clockShiftClicks, setClockShiftClicks] = useState(0);

  /* ================= LOCAL STORAGE ================= */
  useEffect(() => {
    const savedSchedule = localStorage.getItem("schedule");
    const savedHeaders = localStorage.getItem("headers");
    const savedTitle = localStorage.getItem("title");

    if (savedSchedule && savedHeaders) {
      setSchedule(JSON.parse(savedSchedule));
      setHeaders(JSON.parse(savedHeaders));
    }

    if (savedTitle) setTitle(savedTitle);
  }, []);

  useEffect(() => {
    if (schedule.length && headers.length) {
      localStorage.setItem("schedule", JSON.stringify(schedule));
      localStorage.setItem("headers", JSON.stringify(headers));
    }
  }, [schedule, headers]);

  useEffect(() => {
    localStorage.setItem("title", title);
  }, [title]);

  /* ================= TIME ================= */
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  /* ================= NEXT CLASS ================= */
  const nextClass = useMemo(() => {
    if (!schedule.length || !headers.length) return "—";

    const now = currentTime;
    const todayIndex = now.getDay();
    const dayColumn = headers[todayIndex];
    if (!dayColumn) return "—";

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let row of schedule) {
      const timeRange = row[headers[0]];
      if (!timeRange) continue;

      const [start] = timeRange.split("-");
      const [h, m] = start.split(":").map(Number);
      const classMinutes = h * 60 + m;

      if (classMinutes > currentMinutes) {
        return row[dayColumn] || "—";
      }
    }

    return "Sin clases restantes";
  }, [currentTime, schedule, headers]);

  /* ================= DYNAMIC GRADIENT (MAC-LIKE) ================= */
  const gradientStyle = useMemo(() => {
    const hour = currentTime.getHours();

    if (hour >= 5 && hour < 8)
      return "linear-gradient(to bottom, #0f172a 0%, #1e3a8a 60%, #60a5fa 100%)";
    if (hour >= 8 && hour < 12)
      return "linear-gradient(to bottom, #1e40af 0%, #2563eb 50%, #93c5fd 100%)";
    if (hour >= 12 && hour < 16)
      return "linear-gradient(to bottom, #1d4ed8 0%, #3b82f6 60%, #bfdbfe 100%)";
    if (hour >= 16 && hour < 19)
      return "linear-gradient(to bottom, #1e3a8a 0%, #1e40af 70%, #3b82f6 100%)";
    if (hour >= 19 && hour < 22)
      return "linear-gradient(to bottom, #020617 0%, #0f172a 50%, #1e3a8a 100%)";

    return "linear-gradient(to bottom, #000814 0%, #020617 60%, #0f172a 100%)";
  }, [currentTime]);

  /* ================= CSV IMPORT ================= */
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(results.meta.fields || []);
        setSchedule(results.data || []);
      },
    });
  };

  /* ================= RESET (doble Shift+Click en reloj) ================= */
  const handleClockClick = (e) => {
    if (e.shiftKey) {
      const next = clockShiftClicks + 1;
      setClockShiftClicks(next);
      if (next >= 2) {
        setClockShiftClicks(0);
        setShowResetConfirm(true);
      }
    }
  };

  const handleReset = () => {
    localStorage.removeItem("schedule");
    localStorage.removeItem("headers");
    localStorage.removeItem("title");
    setSchedule([]);
    setHeaders([]);
    setTitle("Timely");
    setShowResetConfirm(false);
  };

  /* ================= EDIT TITLE (Shift+Click en título) ================= */
  const handleTitleClick = (e) => {
    if (e.shiftKey) setEditingTitle(true);
  };

  /* ================= EDIT CELL ================= */
  const handleCellClick = (e, rowIndex, key) => {
    if (e.shiftKey) {
      setEditingCell({ rowIndex, key });
    }
  };

  const handleCellChange = (value) => {
    const updated = [...schedule];
    updated[editingCell.rowIndex][editingCell.key] = value;
    setSchedule(updated);
  };

  /* ================= FIRST RUN ================= */
  if (!schedule.length || !headers.length) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-all duration-1000 font-sans"
        style={{
          background: gradientStyle,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          WebkitAppRegion: "drag",
        }}
      >
        <div
          className="bg-white/20 backdrop-blur-3xl border border-white/30 p-12 rounded-3xl shadow-2xl text-center"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {/* Traffic lights arriba a la izquierda */}
          <div className="flex justify-start mb-6">
            <TrafficLights />
          </div>

          <h1 className="text-2xl font-semibold mb-2 text-white">Timely</h1>
          <p className="text-white/60 text-sm mb-8">Selecciona tu archivo CSV para comenzar</p>

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

  return (
    <div
      className="min-h-screen p-12 transition-all duration-1000"
      style={{
        background: gradientStyle,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        WebkitAppRegion: "drag",
      }}
    >
      <div className="max-w-6xl mx-auto bg-white/20 backdrop-blur-3xl border border-white/30 rounded-3xl p-10 shadow-2xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">

          {/* Traffic lights integrados */}
          <TrafficLights />

          {/* Título editable — Shift+Click para editar, Ctrl+Click para reset */}
          <div
            onClick={handleTitleClick}
            className="text-3xl font-semibold text-white select-none cursor-default text-center flex-1 mx-8"
            style={{ WebkitAppRegion: "drag" }}
            title="Shift+Click para editar · Ctrl+Click para resetear"
          >
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                autoFocus
                className="bg-transparent border-b border-white text-center outline-none"
                style={{ WebkitAppRegion: "no-drag" }}
              />
            ) : (
              title
            )}
          </div>

          {/* Reloj con segundero on hover — doble Shift+Click para reset */}
          <div
            className="text-right text-white group cursor-default"
            style={{ WebkitAppRegion: "no-drag" }}
            onClick={handleClockClick}
            title="Doble Shift+Click para resetear"
          >
            <div className="text-xl font-medium">
              {currentTime.toLocaleTimeString("es-MX", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-xs opacity-0 group-hover:opacity-100 transition duration-200">
              {currentTime.getSeconds()}s
            </div>
            <div className="text-xs mt-1 opacity-70">Próxima clase: {nextClass}</div>
          </div>
        </div>

        {/* GRID */}
        <div
          className="grid overflow-hidden rounded-2xl text-center"
          style={{
            gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))`,
            WebkitAppRegion: "no-drag",
          }}
        >
          {headers.map((header, i) => (
            <div
              key={i}
              className="p-4 font-semibold text-white bg-white/10 backdrop-blur-xl border border-white/20"
            >
              {header}
            </div>
          ))}

          {schedule.map((row, i) =>
            headers.map((key, j) => (
              <div
                key={`${i}-${j}`}
                onClick={(e) => handleCellClick(e, i, key)}
                className="p-4 text-white bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:bg-white/10 cursor-default"
              >
                {editingCell &&
                editingCell.rowIndex === i &&
                editingCell.key === key ? (
                  <input
                    value={row[key]}
                    onChange={(e) => handleCellChange(e.target.value)}
                    onBlur={() => setEditingCell(null)}
                    autoFocus
                    className="bg-transparent border-b border-white text-center outline-none w-full"
                  />
                ) : (
                  row[key]
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= RESET CONFIRMATION MODAL ================= */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          />
          {/* modal */}
          <div className="relative bg-white/20 backdrop-blur-3xl border border-white/30 rounded-2xl p-8 shadow-2xl text-center w-72">
            <div className="text-2xl mb-3">🗑️</div>
            <h2 className="text-white font-semibold text-lg mb-1">Resetear Timely</h2>
            <p className="text-white/60 text-sm mb-6">Se borrará tu horario y todos los datos guardados.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                className="px-5 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium transition-all"
              >
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
