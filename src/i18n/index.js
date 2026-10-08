import { createInstance } from "i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import { BOOTSTRAP_CSS, LANGUAGES, LANG_COOKIE, baseLanguage, languageDir } from "./settings";

export { LANGUAGES, baseLanguage, languageDir } from "./settings";

const applyDocumentLanguage = (code) => {
	const lang = baseLanguage(code);
	const dir = languageDir(code);
	document.documentElement.lang = lang;
	document.documentElement.dir = dir;

	const link = document.getElementById("bootstrap-css");
	if (link && link.getAttribute("href") !== BOOTSTRAP_CSS[dir].href) {
		link.setAttribute("integrity", BOOTSTRAP_CSS[dir].integrity);
		link.setAttribute("href", BOOTSTRAP_CSS[dir].href);
	}

	// remembered for the next server render
	document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
	try {
		localStorage.setItem(LANG_COOKIE, lang);
	} catch {
		// storage disabled: the cookie is enough
	}
};

export const resources = {
	en: { translation: en },
	fr: { translation: fr },
	ar: { translation: ar },
};

// One instance per request on the server, one per page load in the browser
export const createI18n = (lng) => {
	const i18n = createInstance();
	i18n.init({
		lng,
		resources,
		supportedLngs: LANGUAGES.map((l) => l.code),
		nonExplicitSupportedLngs: true, // fr-FR -> fr
		load: "languageOnly",
		fallbackLng: "en",
		initImmediate: false, // resources are bundled: initialise synchronously
		interpolation: { escapeValue: false }, // React already escapes
	});
	if (typeof window !== "undefined") i18n.on("languageChanged", applyDocumentLanguage);
	return i18n;
};
