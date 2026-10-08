import { Suspense } from "react";
import Login from "@/Components/Login/Login";

// already signed in users are sent to "/" by the middleware
export default function Page() {
	return (
		// Login reads ?sign-in / ?sign-up
		<Suspense>
			<Login />
		</Suspense>
	);
}
