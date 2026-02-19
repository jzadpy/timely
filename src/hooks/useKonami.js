import { useState, useEffect, useRef, useCallback } from "react";

export const KEY_LABELS = {
    ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
    b: "B", a: "A", Enter: "↵",
};

/**
 * useKonami — detects a key sequence and calls onSuccess when matched.
 * @param {string[]} sequence  Array of KeyboardEvent.key values
 * @param {() => void} onSuccess  Called when the full sequence is entered
 * @returns {{ progress: {key, correct}[] }}  Current progress dots
 */
export function useKonami(sequence, onSuccess) {
    const [progress, setProgress] = useState([]);
    const indexRef = useRef(0);
    const timerRef = useRef(null);

    const reset = useCallback(() => {
        indexRef.current = 0;
        setProgress([]);
    }, []);

    useEffect(() => {
        const handleKey = (e) => {
            const key = e.key;
            const expected = sequence[indexRef.current];

            if (key === expected) {
                const next = indexRef.current + 1;
                indexRef.current = next;
                setProgress((p) => [...p, { key, correct: true }]);
                if (timerRef.current) clearTimeout(timerRef.current);

                if (next === sequence.length) {
                    onSuccess();
                    setTimeout(reset, 600);
                } else {
                    timerRef.current = setTimeout(reset, 4000);
                }
            } else if (indexRef.current > 0) {
                setProgress((p) => [...p, { key, correct: false }]);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(reset, 800);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [sequence, onSuccess, reset]);

    return { progress };
}
