import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { idParam } from "@/lib/validate";

// DELETE -> removes one of the user's mappings
export async function DELETE(_request, { params }) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const id = idParam((await params).id);
	// scoped to the user: another user's id simply matches nothing
	const { count } = id ? await prisma.mapping.deleteMany({ where: { id, userId: user.id } }) : { count: 0 };
	if (count === 0) return NextResponse.json({ code: "notFound" }, { status: 404 });
	return NextResponse.json({ deleted: true });
}
