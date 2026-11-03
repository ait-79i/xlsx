import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, sessionCookie, verifyToken } from "@/lib/session";
import { clientIp } from "@/lib/auth";
import { LIMITS, hit, reset } from "@/lib/rateLimit";

// POST { email, pwd } -> { auth: true, user } and sets the session cookie
export async function POST(request) {
	const { email, pwd } = await request.json().catch(() => ({}));
	if (!email || !pwd) {
		return NextResponse.json({ auth: false, code: "missingCredentials" }, { status: 400 });
	}
	const address = String(email).trim().toLowerCase();

	// slows down password guessing: per address and per client
	// (the address comes from X-Forwarded-For, which a client can change: the per account limit covers that)
	const key = `login:${clientIp(request)}:${address}`;
	const ipLimit = hit(key, LIMITS.login);
	const accountLimit = hit(`login-account:${address}`, LIMITS.loginAccount);
	const limit = !ipLimit.ok ? ipLimit : accountLimit;
	if (!limit.ok) {
		return NextResponse.json(
			{ auth: false, code: "tooManyAttempts", retryAfter: limit.retryAfter },
			{ status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
		);
	}

	const user = await prisma.user.findUnique({ where: { email: address } });
	if (!user || !(await bcrypt.compare(String(pwd), user.password))) {
		return NextResponse.json({ auth: false, code: "unauthorized" }, { status: 401 });
	}
	reset(key);
	reset(`login-account:${address}`);

	const token = await createToken(user);
	const { exp } = await verifyToken(token);
	const response = NextResponse.json({
		auth: true,
		user: { id: user.id, username: user.username, email: user.email },
	});
	response.cookies.set(sessionCookie(token, exp - Math.floor(Date.now() / 1000)));
	return response;
}
