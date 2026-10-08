import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import Home from "@/home/Home";

export default async function Page() {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	return <Home signedIn={Boolean(session)} />;
}
