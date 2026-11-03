// Sending one request per item of a JSON array (API tester, "one request per item").

const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

/** Names used in a URL template: "/customers/{{id}}/orders/{{order.ref}}" -> ["id", "order.ref"] */
export const templateKeys = (url) => [...new Set([...String(url).matchAll(PLACEHOLDER)].map((m) => m[1]))];

const valueAt = (item, path) =>
	path.split(".").reduce((v, key) => (v !== null && typeof v === "object" ? v[key] : undefined), item);

/**
 * Fills the {{placeholders}} of a URL with the values of an item (URL encoded).
 * @returns {{ url: string, missing: string[] }} missing: placeholders the item has no value for
 */
export function fillTemplate(url, item) {
	const missing = [];
	const filled = String(url).replace(PLACEHOLDER, (_, path) => {
		const v = valueAt(item, path);
		if (v === undefined || v === null || (typeof v === "object")) {
			missing.push(path);
			return "";
		}
		return encodeURIComponent(String(v));
	});
	return { url: filled, missing };
}

/**
 * Sends items with at most `concurrency` requests at a time.
 * send(item, index) resolves to { status, ms } or throws ({ code }) when there is no response.
 * onResult(result) is called as each one finishes. Stops starting new requests when signal is aborted.
 * @returns {Promise<object[]>} one result per item (in item order): { index, status?, ok, ms?, error? }
 */
export async function runBatch(items, send, { concurrency = 2, onResult = () => {}, signal } = {}) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length && !signal?.aborted) {
			const index = next++;
			let result;
			try {
				const r = await send(items[index], index);
				result = { index, status: r.status, ok: r.status >= 200 && r.status < 300, ms: r.ms, detail: r.detail };
			} catch (e) {
				result = { index, ok: false, error: e?.code ?? (e?.name === "AbortError" ? "aborted" : "network") };
			}
			results[index] = result;
			onResult(result);
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));
	return results;
}

/** Counts of a batch run. */
export function summarize(results) {
	const done = results.filter(Boolean);
	return {
		done: done.length,
		ok: done.filter((r) => r.ok).length,
		failed: done.filter((r) => !r.ok).length,
	};
}

/** CSV report: one line per item. */
export function batchReport(results, urls = []) {
	const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
	const lines = ["item,url,status,ok,ms,error,detail"];
	results.forEach((r, i) => {
		if (!r) return;
		lines.push([r.index + 1, urls[i] ?? "", r.status ?? "", r.ok, r.ms === undefined ? "" : Math.round(r.ms), r.error ?? "", r.detail ?? ""].map(quote).join(","));
	});
	return lines.join("\n") + "\n";
}
