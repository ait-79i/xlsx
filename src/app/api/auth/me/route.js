import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// Replaces the old GET /isUserAuth: { auth: true, user } while the session is valid
export async function GET() {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	if (!session) return NextResponse.json({ auth: false }, { status: 401 });
	return NextResponse.json({
		auth: true,
		user: { id: Number(session.sub), username: session.username, email: session.email },
	});
}
