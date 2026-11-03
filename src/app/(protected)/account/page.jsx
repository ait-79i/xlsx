"use client";

import dynamic from "next/dynamic";

// client only: the page reads the account from the API
const Account = dynamic(() => import("@/Components/Account/Account"), { ssr: false });

export default function Page() {
	return <Account />;
}
