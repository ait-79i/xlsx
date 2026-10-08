import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";

export async function POST() {
	const response = NextResponse.json({ auth: false });
	response.cookies.set(sessionCookie("", 0));
	return response;
}
