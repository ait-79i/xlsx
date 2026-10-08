"use client";

import { useEffect, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n, resources } from "@/i18n";
import { AppStateProvider } from "./app-state";

export default function Providers({ lang, children }) {
	const [i18n] = useState(() => createI18n(lang));

	// in development, a locale file edited while the page is open replaces the texts without a reload
	// (`resources` is a new object after each hot update of the locale files)
	const loaded = useRef(resources);
	useEffect(() => {
		if (loaded.current === resources) return;
		loaded.current = resources;
		for (const [code, { translation }] of Object.entries(resources)) {
			i18n.addResourceBundle(code, "translation", translation, true, true);
		}
		i18n.changeLanguage(i18n.language);
	});

	return (
		<I18nextProvider i18n={i18n}>
			<AppStateProvider>{children}</AppStateProvider>
		</I18nextProvider>
	);
}
