"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

const Loading = () => {
	const { t } = useTranslation();
	return <p className="p-3">{t("loading")}</p>;
};

// browser only: the workbook is kept in sessionStorage, and React Flow powers the graph views
const Converter = dynamic(() => import("@/Components/Converter/Converter"), {
	ssr: false,
	loading: Loading,
});

export default function Page() {
	return <Converter />;
}
