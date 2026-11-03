import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/auth";
import { jsonSize, text } from "@/lib/validate";
import { METHODS } from "@/utils/http";

const MAX_BODY_BYTES = 512 * 1024;
const MAX_PER_USER = 200;
const SELECT = { id: true, name: true, method: true, url: true, headers: true, body: true, updatedAt: true };

// GET -> the user's saved requests, newest first
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const requests = await prisma.savedRequest.findMany({
		where: { userId: user.id },
		orderBy: { updatedAt: "desc" },
		select: SELECT,
	});
	return NextResponse.json({ requests });
}

// POST { name, method, url, headers, body?, overwrite? } -> saved request; 409 when the name exists
export async function POST(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const input = await request.json().catch(() => ({}));
	const name = text(input.name, { max: 80 });
	const url = text(input.url, { max: 2000 });
	const headers = Array.isArray(input.headers)
		? input.headers
			.filter((h) => h && typeof h.key === "string" && typeof h.value === "string")
			.slice(0, 50)
			.map((h) => ({ key: h.key.slice(0, 200), value: h.value.slice(0, 4000), on: h.on !== false }))
		: [];
	const body = typeof input.body === "string" && input.body !== "" ? input.body : null;
	if (!name || !url || !METHODS.includes(input.method)) return badRequest();
	if (body && jsonSize(body) > MAX_BODY_BYTES) return badRequest("tooLarge");

	const where = { userId_name: { userId: user.id, name } };
	const existing = await prisma.savedRequest.findUnique({ where });
	if (existing && !input.overwrite) return NextResponse.json({ code: "nameTaken" }, { status: 409 });
	if (!existing && (await prisma.savedRequest.count({ where: { userId: user.id } })) >= MAX_PER_USER) {
		return badRequest("tooMany");
	}
	const data = { method: input.method, url, headers, body };
	const saved = await prisma.savedRequest.upsert({
		where,
		update: data,
		create: { userId: user.id, name, ...data },
		select: SELECT,
	});
	return NextResponse.json({ request: saved }, { status: existing ? 200 : 201 });
}
