import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/auth";
import { createToken, sessionCookie, verifyToken } from "@/lib/session";
import { LIMITS, hit } from "@/lib/rateLimit";
import { MIN_PASSWORD_LENGTH } from "@/lib/validate";

// POST { current, next } -> changes the password and signs out every other session
export async function POST(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	if (!hit(`password:${user.id}`, LIMITS.password).ok) {
		return NextResponse.json({ code: "tooManyAttempts" }, { status: 429 });
	}
	const { current, next } = await request.json().catch(() => ({}));
	if (!current || !(await bcrypt.compare(String(current), user.password))) {
		return NextResponse.json({ code: "wrongPassword" }, { status: 403 });
	}
	if (typeof next !== "string" || next.length < MIN_PASSWORD_LENGTH) return badRequest("weakPassword");

	const updated = await prisma.user.update({
		where: { id: user.id },
		data: { password: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 } },
	});
	// this session stays signed in with a token of the new version
	const token = await createToken(updated);
	const { exp } = await verifyToken(token);
	const response = NextResponse.json({ changed: true });
	response.cookies.set(sessionCookie(token, exp - Math.floor(Date.now() / 1000)));
	return response;
}
