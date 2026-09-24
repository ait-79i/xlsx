import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";

export const LANGUAGES = [
	{ code: "en", label: "English", dir: "ltr" },
	{ code: "fr", label: "Français", dir: "ltr" },
	{ code: "ar", label: "العربية", dir: "rtl" },
];

// Bootstrap ships a mirrored stylesheet for right-to-left languages
const BOOTSTRAP_CSS = {
	ltr: {
		href: "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css",
		integrity: "sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65",
	},
	rtl: {
		href: "https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.rtl.min.css",
		integrity: "sha384-DOXMLfHhQkvFFp+rWTZwVlPVqdIhpDVYT9csOnHSgWQWPX0v5MCGtjCJbY6ERspU",
	},
};

// "ar-MA" -> "ar"
export const baseLanguage = (code = "en") => code.split("-")[0];

export const languageDir = (code) =>
	LANGUAGES.find((l) => l.code === baseLanguage(code))?.dir ?? "ltr";

const applyDocumentLanguage = (code) => {
	const dir = languageDir(code);
	document.documentElement.lang = baseLanguage(code);
	document.documentElement.dir = dir;

	const link = document.getElementById("bootstrap-css");
	if (link && link.getAttribute("href") !== BOOTSTRAP_CSS[dir].href) {
		link.setAttribute("integrity", BOOTSTRAP_CSS[dir].integrity);
		link.setAttribute("href", BOOTSTRAP_CSS[dir].href);
	}
};

i18n.on("languageChanged", applyDocumentLanguage);

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			fr: { translation: fr },
			ar: { translation: ar },
		},
		supportedLngs: LANGUAGES.map((l) => l.code),
		nonExplicitSupportedLngs: true, // fr-FR -> fr
		load: "languageOnly",
		fallbackLng: "en",
		detection: {
			order: ["localStorage", "navigator"],
			lookupLocalStorage: "lang",
			caches: ["localStorage"],
		},
		interpolation: { escapeValue: false }, // React already escapes
	});

export default i18n;
