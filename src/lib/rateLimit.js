// Fixed window rate limiting kept in memory: enough for one server process.
// With several instances, each one counts on its own (use a shared store such as Redis then).

const buckets = new Map();
let lastSweep = 0;

/**
 * Counts one attempt for `key` and tells whether it is allowed.
 * @returns {{ ok: boolean, retryAfter: number }} retryAfter in seconds when refused
 */
export function hit(key, { limit, windowMs }, now = Date.now()) {
	if (now - lastSweep > 60_000) {
		for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
		lastSweep = now;
	}
	let bucket = buckets.get(key);
	if (!bucket || bucket.reset <= now) {
		bucket = { count: 0, reset: now + windowMs };
		buckets.set(key, bucket);
	}
	bucket.count++;
	if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
	return { ok: true, retryAfter: 0 };
}

/** Forgets the attempts of a key, e.g. after a successful sign in. */
export const reset = (key) => buckets.delete(key);

export const LIMITS = {
	login: { limit: 8, windowMs: 15 * 60_000 },
	// per account, whatever address the attempts claim to come from
	loginAccount: { limit: 20, windowMs: 15 * 60_000 },
	register: { limit: 5, windowMs: 60 * 60_000 },
	contact: { limit: 5, windowMs: 60 * 60_000 },
	proxy: { limit: 120, windowMs: 60_000 },
	password: { limit: 8, windowMs: 15 * 60_000 },
};
