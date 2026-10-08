// Where to send a user after signing in. Only same-site paths are accepted (no "//evil.com"),
// and never back to /login itself.
export const DEFAULT_AFTER_LOGIN = "/excel-to-json";

export const safeNext = (value) => {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
		return DEFAULT_AFTER_LOGIN;
	}
	if (value === "/login" || value.startsWith("/login?") || value.startsWith("/login/")) return DEFAULT_AFTER_LOGIN;
	return value;
};
