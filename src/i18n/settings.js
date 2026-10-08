// Shared by the server (root layout) and the client (i18n instance, language switcher)

export const LANGUAGES = [
	{ code: "en", label: "English", dir: "ltr" },
	{ code: "fr", label: "Français", dir: "ltr" },
	{ code: "ar", label: "العربية", dir: "rtl" },
];

export const DEFAULT_LANGUAGE = "en";

// cookie read by the root layout to render <html lang dir> on the server
export const LANG_COOKIE = "lang";

// Bootstrap ships a mirrored stylesheet for right-to-left languages
export const BOOTSTRAP_CSS = {
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
export const baseLanguage = (code = DEFAULT_LANGUAGE) => code.split("-")[0];

export const languageDir = (code) =>
	LANGUAGES.find((l) => l.code === baseLanguage(code))?.dir ?? "ltr";

const isSupported = (code) => LANGUAGES.some((l) => l.code === code);

// The saved choice first, then the browser languages ("fr-FR,fr;q=0.9,en;q=0.8"), then English
export const resolveLanguage = (saved, acceptLanguage = "") => {
	if (saved && isSupported(baseLanguage(saved))) return baseLanguage(saved);
	const preferred = acceptLanguage
		.split(",")
		.map((part) => {
			const [tag, q] = part.trim().split(";q=");
			return { code: baseLanguage(tag.toLowerCase()), q: q === undefined ? 1 : Number(q) };
		})
		.sort((a, b) => b.q - a.q)
		.find((l) => isSupported(l.code));
	return preferred?.code ?? DEFAULT_LANGUAGE;
};
