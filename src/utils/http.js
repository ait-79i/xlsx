// Helpers for the API tester: building a request from the form, reading the response.

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
export const BODY_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export const DEFAULT_HEADERS = [
	{ id: "h-accept", on: true, key: "Accept", value: "application/json" },
	{ id: "h-type", on: true, key: "Content-Type", value: "application/json" },
];

let counter = 0;
export const newRowId = () => `h${Date.now().toString(36)}${(counter++).toString(36)}`;

/** "example.com/x" -> "https://example.com/x"; null when it can't be an http(s) URL. */
export function normalizeUrl(raw) {
	const text = String(raw ?? "").trim();
	if (!text) return null;
	const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `${/^(localhost|127\.|\[::1\])/i.test(text) ? "http" : "https"}://${text}`;
	try {
		const url = new URL(withScheme);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.toString();
	} catch {
		return null;
	}
}

/** Body text -> { ok, value } or { ok: false, error, line, column } */
export function parseJsonBody(text) {
	if (String(text ?? "").trim() === "") return { ok: true, value: undefined };
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (e) {
		const match = /position (\d+)/.exec(e.message);
		if (!match) return { ok: false, error: e.message };
		const pos = Number(match[1]);
		const before = text.slice(0, pos).split("\n");
		return { ok: false, error: e.message, line: before.length, column: before[before.length - 1].length + 1 };
	}
}

/** Header rows + auth -> plain object of the headers to send (later rows win, case-insensitive). */
export function buildHeaders(rows, auth = { type: "none" }, { hasBody = true } = {}) {
	const out = {};
	const set = (key, value) => {
		for (const k of Object.keys(out)) if (k.toLowerCase() === key.toLowerCase()) delete out[k];
		out[key] = value;
	};
	for (const row of rows) {
		const key = row.key.trim();
		if (!row.on || !key) continue;
		if (!hasBody && key.toLowerCase() === "content-type") continue;
		set(key, row.value);
	}
	if (auth.type === "bearer" && auth.token?.trim()) set("Authorization", `Bearer ${auth.token.trim()}`);
	if (auth.type === "basic" && (auth.user || auth.password)) {
		const bytes = new TextEncoder().encode(`${auth.user ?? ""}:${auth.password ?? ""}`);
		set("Authorization", `Basic ${btoa(String.fromCharCode(...bytes))}`);
	}
	return out;
}

/** Problems that keep the request from being sent, as i18n codes. */
export function requestErrors({ method, url, bodyText }) {
	const errors = {};
	if (!String(url ?? "").trim()) errors.url = "emptyUrl";
	else if (!normalizeUrl(url)) errors.url = "invalidUrl";
	if (BODY_METHODS.includes(method) && !parseJsonBody(bodyText).ok) errors.body = "invalidBody";
	return errors;
}

const shellQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export function toCurl({ method, url, headers, body }) {
	const parts = [`curl -X ${method} ${shellQuote(url)}`];
	for (const [k, v] of Object.entries(headers)) parts.push(`-H ${shellQuote(`${k}: ${v}`)}`);
	if (body !== undefined) parts.push(`--data ${shellQuote(body)}`);
	return parts.join(" \\\n  ");
}

export function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const formatMs = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

/** success | redirect | client | server */
export function statusTone(status) {
	if (status >= 200 && status < 300) return "success";
	if (status >= 300 && status < 400) return "redirect";
	if (status >= 400 && status < 500) return "client";
	return "server";
}

export const STATUS_TEXT = {
	200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
	301: "Moved Permanently", 302: "Found", 304: "Not Modified", 307: "Temporary Redirect", 308: "Permanent Redirect",
	400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
	409: "Conflict", 413: "Payload Too Large", 415: "Unsupported Media Type", 422: "Unprocessable Content", 429: "Too Many Requests",
	500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
};

/** Raw response text -> { json } when it is JSON, else { text } */
export function readBody(text, contentType = "") {
	if (text === "") return { text: "" };
	const looksJson = /json/i.test(contentType) || /^\s*[[{]/.test(text);
	if (looksJson) {
		try {
			return { json: JSON.parse(text) };
		} catch {
			// not JSON after all
		}
	}
	return { text };
}

/** Short description of a JSON body: "Array of 120 items", "Object with 4 keys" */
export function describeJson(value) {
	if (Array.isArray(value)) return { kind: "array", count: value.length };
	if (value !== null && typeof value === "object") return { kind: "object", count: Object.keys(value).length };
	return { kind: "value", count: 0 };
}
