import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import { safeNext } from "@/lib/redirect";

const PROTECTED = ["/excel-to-json", "/json-structure", "/test-api", "/visualizer"];

export async function middleware(request) {
	const { pathname, search, searchParams } = request.nextUrl;
	const logged = Boolean(await verifyToken(request.cookies.get(SESSION_COOKIE)?.value));

	// already signed in: go straight to the page that was asked for (or the app)
	if (pathname === "/login" && logged) {
		return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), request.url));
	}

	if (!logged && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
		// remember the page so the user lands back on it after signing in
		const login = new URL("/login", request.url);
		login.search = `?sign-in&next=${encodeURIComponent(pathname + search)}`;
		const response = NextResponse.redirect(login);
		// an expired or forged token is dropped
		if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/login", "/excel-to-json/:path*", "/json-structure/:path*", "/test-api/:path*", "/visualizer/:path*"],
};
