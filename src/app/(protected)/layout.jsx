import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";
import Navbar from "@/Components/Navbar";

// Pages that need a signed in user (the middleware already redirects, this is a second check)
export default async function ProtectedLayout({ children }) {
	const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
	if (!session) redirect("/login");

	return (
		<>
			<Navbar />
			{children}
		</>
	);
}
