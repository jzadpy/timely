import React from "react";

const SHORTCUTS = [
    { keys: ["Shift", "Click título"], desc: "Editar nombre de la app" },
    { keys: ["Shift", "Click celda"], desc: "Editar contenido de celda" },
    { keys: ["Shift×2", "Click reloj"], desc: "Abrir diálogo de reset" },
    { keys: ["↑↑↓↓←→←→BA↵"], desc: "Activar / desactivar modo debug" },
    { keys: ["?"], desc: "Mostrar esta pantalla" },
    { keys: ["Esc"], desc: "Cerrar paneles / modales" },
];

export default function ShortcutsModal({ onClose }) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ WebkitAppRegion: "no-drag" }}
        >
            {/* backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* card */}
            <div className={`relative p-8 shadow-2xl w-[420px] max-w-[90vw] transition-all duration-300 ${window.isOfflineMode ? 'bg-black border border-white' : 'bg-white/15 backdrop-blur-3xl border border-white/25 rounded-3xl'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-semibold text-lg uppercase tracking-wide">Atajos de teclado</h2>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white/80 transition text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {SHORTCUTS.map(({ keys, desc }, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <span className={`text-sm ${window.isOfflineMode ? 'text-white/80' : 'text-white/60'}`}>{desc}</span>
                            <div className="flex gap-1 flex-shrink-0">
                                {keys.map((k, j) => (
                                    <kbd
                                        key={j}
                                        className={`px-2 py-0.5 text-xs font-mono border ${window.isOfflineMode ? 'border-white text-white bg-black' : 'rounded-lg text-white/80 border-white/20 bg-white/5'}`}
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <p className={`text-xs mt-6 text-center ${window.isOfflineMode ? 'text-white/40' : 'text-white/25'}`}>
                    Presiona <kbd className={`px-1 border ${window.isOfflineMode ? 'border-white/40 text-white/40' : 'rounded border-white/20 text-white/40 bg-white/5'}`}>Esc</kbd> o haz clic afuera para cerrar
                </p>
            </div>
        </div>
    );
}
