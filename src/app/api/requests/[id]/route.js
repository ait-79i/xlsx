import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { idParam } from "@/lib/validate";

// DELETE -> removes one of the user's saved requests
export async function DELETE(_request, { params }) {
	const user = await getCurrentUser();
	if (!user) return unauthorized();
	const id = idParam((await params).id);
	const { count } = id ? await prisma.savedRequest.deleteMany({ where: { id, userId: user.id } }) : { count: 0 };
	if (count === 0) return NextResponse.json({ code: "notFound" }, { status: 404 });
	return NextResponse.json({ deleted: true });
}
