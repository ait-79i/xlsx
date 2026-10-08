"use client";

import { useTranslation } from "react-i18next";

export default function Support() {
	const { t } = useTranslation();
	return <h1>{t("nav.contactUs")}</h1>;
}
