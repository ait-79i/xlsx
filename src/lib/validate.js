// Small input checks shared by the API routes

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/** Trimmed string of at most `max` characters, or null when missing, empty or too long. */
export function text(value, { max = 200, min = 1 } = {}) {
	if (typeof value !== "string") return null;
	const v = value.trim();
	return v.length >= min && v.length <= max ? v : null;
}

/** Size in bytes of a value once serialized, to cap what users store. */
export const jsonSize = (value) => new TextEncoder().encode(JSON.stringify(value ?? null)).length;

/** Integer id from a route parameter, or null. */
export function idParam(value) {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : null;
}
