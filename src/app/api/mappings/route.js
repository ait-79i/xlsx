import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, getCurrentUser, unauthorized } from "@/lib/auth";
import { jsonSize, text } from "@/lib/validate";

const KINDS = ["sheet", "json"];
const MAX_BYTES = 512 * 1024;
const MAX_PER_USER = 200;
const SELECT = { id: true, name: true, data: true, updatedAt: true };

// GET ?kind=sheet|json -> the user's saved mappings of that kind, newest first
export async function GET(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const kind = new URL(request.url).searchParams.get("kind");
	if (!KINDS.includes(kind)) return badRequest();
	const mappings = await prisma.mapping.findMany({
		where: { userId: user.id, kind },
		orderBy: { updatedAt: "desc" },
		select: SELECT,
	});
	return NextResponse.json({ mappings });
}

// POST { kind, name, data, overwrite? } -> saved mapping; 409 when the name exists and overwrite is not set
export async function POST(request) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const body = await request.json().catch(() => ({}));
	const name = text(body.name, { max: 80 });
	if (!KINDS.includes(body.kind) || !name || typeof body.data !== "object" || body.data === null) return badRequest();
	if (jsonSize(body.data) > MAX_BYTES) return badRequest("tooLarge");

	const where = { userId_kind_name: { userId: user.id, kind: body.kind, name } };
	const existing = await prisma.mapping.findUnique({ where });
	if (existing && !body.overwrite) return NextResponse.json({ code: "nameTaken" }, { status: 409 });
	if (!existing && (await prisma.mapping.count({ where: { userId: user.id } })) >= MAX_PER_USER) {
		return badRequest("tooMany");
	}
	const mapping = await prisma.mapping.upsert({
		where,
		update: { data: body.data },
		create: { userId: user.id, kind: body.kind, name, data: body.data },
		select: SELECT,
	});
	return NextResponse.json({ mapping }, { status: existing ? 200 : 201 });
}
