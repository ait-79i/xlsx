import { useEffect, useState } from "react";

/**
 * useState that survives a page reload (sessionStorage).
 * Falls back to plain in-memory state when the storage is unavailable or full.
 * The stored value is only read in the browser: render it from client-only components
 * (the visualizer), otherwise the server and the browser would render different markup.
 */
export function useSessionState(key, initialValue) {
	const [value, setValue] = useState(() => {
		if (typeof window === "undefined") return initialValue;
		try {
			const stored = sessionStorage.getItem(key);
			return stored !== null ? JSON.parse(stored) : initialValue;
		} catch {
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			if (value === undefined || value === null) sessionStorage.removeItem(key);
			else sessionStorage.setItem(key, JSON.stringify(value));
		} catch {
			// quota exceeded: the value is only kept in memory
		}
	}, [key, value]);

	return [value, setValue];
}
