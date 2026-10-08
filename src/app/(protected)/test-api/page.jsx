"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

const Loading = () => {
	const { t } = useTranslation();
	return <p className="p-3">{t("loading")}</p>;
};

// browser only: the request is kept in sessionStorage
const ApiTester = dynamic(() => import("@/Components/ApiTester/ApiTester"), {
	ssr: false,
	loading: Loading,
});

export default function Page() {
	return <ApiTester />;
}
