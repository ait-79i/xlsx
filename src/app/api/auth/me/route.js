import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/auth";

// { auth: true, user } while the session is valid
export async function GET() {
	const user = await getCurrentUser();
	if (!user) return NextResponse.json({ auth: false }, { status: 401 });
	return NextResponse.json({ auth: true, user: publicUser(user) });
}
