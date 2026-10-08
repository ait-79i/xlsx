"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

const Loading = () => {
	const { t } = useTranslation();
	return <p className="p-3">{t("loading")}</p>;
};

// browser only: the JSON is kept in sessionStorage, and React Flow powers the graph view
const Reshape = dynamic(() => import("@/Components/Reshape/Reshape"), {
	ssr: false,
	loading: Loading,
});

export default function Page() {
	return <Reshape />;
}
