// The signed in user, read from the session cookie and checked against the database
// (node runtime only: route handlers and server components, not the middleware).
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { SESSION_COOKIE, verifyToken } from "./session";

/** The user of the session, or null when signed out, deleted, or signed out by a password change. */
export async function getCurrentUser() {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	if (!session) return null;
	const user = await prisma.user.findUnique({ where: { id: Number(session.sub) } });
	if (!user || user.sessionVersion !== (session.v ?? 0)) return null;
	return user;
}

export const publicUser = (user) => ({
	id: user.id,
	username: user.username,
	email: user.email,
	createdAt: user.createdAt,
});

export const unauthorized = () => NextResponse.json({ code: "unauthorized" }, { status: 401 });

export const badRequest = (code = "invalidData", extra = {}) =>
	NextResponse.json({ code, ...extra }, { status: 400 });

/** Client address, for rate limiting (behind a proxy, its first forwarded address). */
export const clientIp = (request) =>
	request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
