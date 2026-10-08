import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import { assertPublicHost } from "@/lib/ssrf";
import { METHODS } from "@/utils/http";

// Sends a request from the server for the API tester, for APIs that refuse calls from a browser (CORS).
// Signed in users only, public addresses only, no redirects followed, limited time and size.
export const runtime = "nodejs";

const TIMEOUT_MS = 30_000;
const MAX_BYTES = 5 * 1024 * 1024;
// set by fetch itself, or meaningless once the request leaves this server
const DROPPED_HEADERS = ["host", "connection", "content-length", "cookie", "transfer-encoding", "upgrade"];

const fail = (code, status = 400) => NextResponse.json({ error: code }, { status });

async function readLimited(response) {
	const reader = response.body?.getReader();
	if (!reader) return { text: "", size: 0, truncated: false };
	const chunks = [];
	let size = 0;
	let truncated = false;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BYTES) {
			truncated = true;
			await reader.cancel();
			break;
		}
		chunks.push(value);
	}
	return { text: Buffer.concat(chunks).toString("utf8"), size: Math.min(size, MAX_BYTES), truncated };
}

export async function POST(request) {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	if (!session) return fail("unauthorized", 401);

	let input;
	try {
		input = await request.json();
	} catch {
		return fail("invalidRequest");
	}
	const { method, url, headers = {}, body } = input ?? {};
	if (!METHODS.includes(method)) return fail("invalidRequest");

	let target;
	try {
		target = new URL(url);
	} catch {
		return fail("invalidUrl");
	}
	if (target.protocol !== "http:" && target.protocol !== "https:") return fail("invalidUrl");

	try {
		await assertPublicHost(target.hostname);
	} catch (e) {
		return fail(e.code === "privateAddress" ? "privateAddress" : "dnsFailed");
	}

	const outgoing = {};
	for (const [k, v] of Object.entries(headers)) {
		if (typeof v === "string" && !DROPPED_HEADERS.includes(k.toLowerCase())) outgoing[k] = v;
	}

	const started = performance.now();
	let response;
	try {
		response = await fetch(target, {
			method,
			headers: outgoing,
			body: method === "GET" || body === undefined ? undefined : body,
			redirect: "manual",
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (e) {
		return fail(e.name === "TimeoutError" ? "timeout" : "unreachable", 502);
	}
	const { text, size, truncated } = await readLimited(response);

	return NextResponse.json({
		status: response.status,
		statusText: response.statusText,
		headers: [...response.headers.entries()],
		body: text,
		size,
		truncated,
		ms: performance.now() - started,
	});
}
