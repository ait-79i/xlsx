import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, sessionCookie, verifyToken } from "@/lib/session";

// POST { email, pwd } -> { auth: true, user } and sets the session cookie
export async function POST(request) {
	const { email, pwd } = await request.json().catch(() => ({}));
	if (!email || !pwd) {
		return NextResponse.json({ auth: false, code: "missingCredentials" }, { status: 400 });
	}

	const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
	if (!user || !(await bcrypt.compare(String(pwd), user.password))) {
		return NextResponse.json({ auth: false, code: "unauthorized" }, { status: 401 });
	}

	const token = await createToken(user);
	const { exp } = await verifyToken(token);
	const response = NextResponse.json({
		auth: true,
		user: { id: user.id, username: user.username, email: user.email },
	});
	response.cookies.set(sessionCookie(token, exp - Math.floor(Date.now() / 1000)));
	return response;
}
