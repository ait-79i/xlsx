import { cookies, headers } from "next/headers";
import { BOOTSTRAP_CSS, LANG_COOKIE, languageDir, resolveLanguage } from "@/i18n/settings";
import Providers from "./providers";
import "./globals.css";

export const metadata = {
	title: "Excel → JSON",
	description: "Convert Excel files to JSON, reshape the JSON, test it against an API and visualize it.",
};

export default async function RootLayout({ children }) {
	const lang = resolveLanguage(
		(await cookies()).get(LANG_COOKIE)?.value,
		(await headers()).get("accept-language") ?? ""
	);
	const dir = languageDir(lang);

	return (
		// lang and dir are updated in the browser when the language changes
		<html lang={lang} dir={dir} suppressHydrationWarning>
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
				{/* eslint-disable-next-line @next/next/no-page-custom-font */}
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
				/>
				{/* swapped for bootstrap.rtl.min.css by src/i18n for right-to-left languages */}
				<link
					id="bootstrap-css"
					rel="stylesheet"
					href={BOOTSTRAP_CSS[dir].href}
					integrity={BOOTSTRAP_CSS[dir].integrity}
					crossOrigin="anonymous"
				/>
				<script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js" async />
				<script noModule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js" async />
			</head>
			<body>
				<Providers lang={lang}>{children}</Providers>
			</body>
		</html>
	);
}
