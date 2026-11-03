import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/Components/Navbar";

// Pages that need a signed in user. The middleware already checks the token signature;
// this also signs out deleted accounts and sessions older than the last password change.
export default async function ProtectedLayout({ children }) {
	const user = await getCurrentUser();
	if (!user) redirect("/login?sign-in");

	return (
		<>
			<Navbar username={user.username} />
			{children}
		</>
	);
}
