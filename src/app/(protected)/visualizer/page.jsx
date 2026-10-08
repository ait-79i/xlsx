"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useAppState } from "@/app/app-state";

const Loading = () => {
	const { t } = useTranslation();
	return <p className="p-3">{t("loading")}</p>;
};

// React Flow is only loaded when the visualizer is opened, and only in the browser
// (the data comes from sessionStorage)
const VisualizerPage = dynamic(() => import("@/Components/Visualizer/VisualizerPage"), {
	ssr: false,
	loading: Loading,
});

export default function Page() {
	const { visualData, setVisualData } = useAppState();
	return <VisualizerPage data={visualData} setData={setVisualData} />;
}
