"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CONTACT_TOPICS } from "../utils/contact";
import Mascot from "./Mascot";
import "./Converter/converter.css";
import "./Account/account.css";
import "./support.css";

const MAX_MESSAGE = 5000;

export default function Support() {
	const { t } = useTranslation();
	const id = useId();
	const [form, setForm] = useState({ name: "", email: "", topic: "", message: "", website: "" });
	const [errors, setErrors] = useState({});
	const [status, setStatus] = useState("idle"); // idle | sending | sent | failed
	const [failure, setFailure] = useState("");

	// signed in: the name and email are already known
	useEffect(() => {
		fetch("/api/auth/me")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => d?.user && setForm((f) => ({ ...f, name: f.name || d.user.username, email: f.email || d.user.email })))
			.catch(() => {});
	}, []);

	const set = (key) => (e) => {
		setForm((f) => ({ ...f, [key]: e.target.value }));
		setErrors((er) => ({ ...er, [key]: undefined }));
	};

	const submit = async (e) => {
		e.preventDefault();
		setStatus("sending");
		setFailure("");
		try {
			const r = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = await r.json().catch(() => ({}));
			if (r.ok) return setStatus("sent");
			if (r.status === 400 && data.errors) {
				setErrors(data.errors);
				setStatus("idle");
				return;
			}
			setFailure(r.status === 429 ? t("contact.errors.tooMany") : t("contact.errors.failed"));
			setStatus("failed");
		} catch {
			setFailure(t("contact.errors.failed"));
			setStatus("failed");
		}
	};

	const error = (key) =>
		errors[key] ? (
			<span className="cv-field-error" id={`${id}-${key}-err`} role="alert">{t(`contact.errors.${errors[key]}`)}</span>
		) : null;

	if (status === "sent") {
		return (
			<div className="cv sp">
				<section className="cv-panel sp-sent" role="status">
					<Mascot pose="success" motion="pop" className="sp-sent__mascot" />
					<h1 className="sp-title">{t("contact.sentTitle")}</h1>
					<p className="sp-text">{t("contact.sentText", { email: form.email })}</p>
					<div className="sp-sent__actions">
						<Link className="cv-btn cv-btn--primary" href="/">{t("nav.home")}</Link>
						<button type="button" className="cv-btn" onClick={() => { setForm((f) => ({ ...f, topic: "", message: "" })); setStatus("idle"); }}>
							{t("contact.another")}
						</button>
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className="cv sp">
			<div className="sp-grid">
				<header className="sp-intro">
					<h1 className="sp-title">{t("contact.title")}</h1>
					<p className="sp-text">{t("contact.text")}</p>
					<ul className="sp-tips">
						<li>{t("contact.tips.bug")}</li>
						<li>{t("contact.tips.privacy")}</li>
					</ul>
					<Mascot pose="main" className="sp-intro__mascot" />
				</header>

				<form className="cv-panel ac-section ac-form sp-form" onSubmit={submit} noValidate>
					<div className="sp-row">
						<label className="ac-field">
							<span>{t("contact.name")}</span>
							<input className="cv-input" value={form.name} onChange={set("name")} maxLength={100} autoComplete="name"
								aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? `${id}-name-err` : undefined} />
							{error("name")}
						</label>
						<label className="ac-field">
							<span>{t("contact.email")}</span>
							<input className="cv-input" type="email" value={form.email} onChange={set("email")} maxLength={200} autoComplete="email" dir="ltr"
								aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? `${id}-email-err` : undefined} />
							{error("email")}
						</label>
					</div>

					<fieldset className="sp-topics" aria-describedby={errors.topic ? `${id}-topic-err` : undefined}>
						<legend className="sp-legend">{t("contact.topic")}</legend>
						<div className="cv-seps__list">
							{CONTACT_TOPICS.map((topic) => (
								<label key={topic} className={`cv-sep${form.topic === topic ? " is-on" : ""}`}>
									<input type="radio" name={`${id}-topic`} value={topic} checked={form.topic === topic} onChange={set("topic")} />
									<span className="sp-topic">{t(`contact.topics.${topic}`)}</span>
								</label>
							))}
						</div>
						{error("topic")}
					</fieldset>

					<label className="ac-field">
						<span>{t("contact.message")}</span>
						<textarea className="cv-input sp-message" value={form.message} onChange={set("message")} maxLength={MAX_MESSAGE} rows={7}
							placeholder={form.topic === "bug" ? t("contact.bugPlaceholder") : ""}
							aria-invalid={errors.message ? true : undefined} aria-describedby={`${id}-count${errors.message ? ` ${id}-message-err` : ""}`} />
						<span className="ac-field__hint" id={`${id}-count`}>{t("contact.count", { count: form.message.length, max: MAX_MESSAGE })}</span>
						{error("message")}
					</label>

					{/* left empty by people, filled in by spam bots */}
					<div className="sp-trap" aria-hidden="true">
						<label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
					</div>

					{failure && <p className="ac-msg is-error" role="alert">{failure}</p>}
					<div className="ac-form__foot">
						<button type="submit" className="cv-btn cv-btn--primary" disabled={status === "sending"}>
							{status === "sending" ? t("contact.sending") : t("contact.send")}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
