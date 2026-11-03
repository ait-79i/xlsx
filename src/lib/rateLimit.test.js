import { hit, reset } from "./rateLimit";

test("allows `limit` attempts per window, then tells when to retry", () => {
	const opts = { limit: 2, windowMs: 1000 };
	expect(hit("a", opts, 0).ok).toBe(true);
	expect(hit("a", opts, 100).ok).toBe(true);
	expect(hit("a", opts, 200)).toEqual({ ok: false, retryAfter: 1 });
	// other keys are counted apart
	expect(hit("b", opts, 200).ok).toBe(true);
	// a new window starts after windowMs
	expect(hit("a", opts, 1001).ok).toBe(true);
});

test("reset forgets a key", () => {
	const opts = { limit: 1, windowMs: 1000 };
	hit("c", opts, 0);
	expect(hit("c", opts, 1).ok).toBe(false);
	reset("c");
	expect(hit("c", opts, 2).ok).toBe(true);
});
