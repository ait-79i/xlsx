"use client";

import { createContext, useContext, useState } from "react";
import { useSessionState } from "@/utils/useSessionState";

// State shared between pages: the JSON sent to /test-api and the data shown in /visualizer
const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
	// data sent to /test-api by another page; the API tester takes it once, then sets it back to null
	const [bodyRequestData, setBodyRequestData] = useState(null);
	// kept across page reloads
	const [visualData, setVisualData] = useSessionState("visualData", null);

	return (
		<AppStateContext.Provider value={{ bodyRequestData, setBodyRequestData, visualData, setVisualData }}>
			{children}
		</AppStateContext.Provider>
	);
}

export const useAppState = () => useContext(AppStateContext);
