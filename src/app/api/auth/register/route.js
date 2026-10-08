import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST { username, email, pwd } -> 201 when the account is created
export async function POST(request) {
	const body = await request.json().catch(() => ({}));
	const username = String(body.username ?? "").trim();
	const email = String(body.email ?? "").trim().toLowerCase();
	const pwd = String(body.pwd ?? "");

	if (!username || !EMAIL.test(email) || pwd.length < MIN_PASSWORD_LENGTH) {
		return NextResponse.json({ code: "invalidData" }, { status: 400 });
	}

	if (await prisma.user.findUnique({ where: { email } })) {
		return NextResponse.json({ code: "emailTaken" }, { status: 409 });
	}

	const user = await prisma.user.create({
		data: { username, email, password: await bcrypt.hash(pwd, 10) },
	});
	return NextResponse.json({ id: user.id, username: user.username, email: user.email }, { status: 201 });
}
