import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import Navbar from "./Navbar";
import PublicHeader from "./PublicHeader";

// The app navbar for signed in users, a minimal header otherwise
export default async function SiteHeader() {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	return session ? <Navbar /> : <PublicHeader />;
}
