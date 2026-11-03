import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, getCurrentUser, publicUser, unauthorized } from "@/lib/auth";
import { createToken, sessionCookie, verifyToken } from "@/lib/session";
import { EMAIL, text } from "@/lib/validate";

const renewSession = async (response, user) => {
	const token = await createToken(user);
	const { exp } = await verifyToken(token);
	response.cookies.set(sessionCookie(token, exp - Math.floor(Date.now() / 1000)));
	return response;
};

// GET -> the profile and what the account holds
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const [mappings, requests] = await Promise.all([
		prisma.mapping.count({ where: { userId: user.id } }),
		prisma.savedRequest.count({ where: { userId: user.id } }),
	]);
	return NextResponse.json({ user: publicUser(user), counts: { mappings, requests } });
}

// PATCH { username?, email? } -> updated profile (the session token carries them, so it is renewed)
export async function PATCH(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const body = await request.json().catch(() => ({}));
	const data = {};
	if (body.username !== undefined) {
		const username = text(body.username, { max: 60 });
		if (!username) return badRequest("invalidUsername");
		data.username = username;
	}
	if (body.email !== undefined) {
		const email = text(body.email, { max: 200 })?.toLowerCase();
		if (!email || !EMAIL.test(email)) return badRequest("invalidEmail");
		if (email !== user.email && (await prisma.user.findUnique({ where: { email } }))) {
			return NextResponse.json({ code: "emailTaken" }, { status: 409 });
		}
		data.email = email;
	}
	const updated = await prisma.user.update({ where: { id: user.id }, data });
	return renewSession(NextResponse.json({ user: publicUser(updated) }), updated);
}

// DELETE { password } -> deletes the account and everything saved with it
export async function DELETE(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const { password } = await request.json().catch(() => ({}));
	if (!password || !(await bcrypt.compare(String(password), user.password))) {
		return NextResponse.json({ code: "wrongPassword" }, { status: 403 });
	}
	await prisma.user.delete({ where: { id: user.id } });
	const response = NextResponse.json({ deleted: true });
	response.cookies.set(sessionCookie("", 0));
	return response;
}
