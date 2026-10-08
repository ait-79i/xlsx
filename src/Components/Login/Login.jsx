"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../LanguageSwitcher";
import { safeNext } from "@/lib/redirect";
import "./Login.css";

const MIN_PASSWORD_LENGTH = 8;

// 0 (empty) to 4 (strong)
export const passwordScore = (pwd) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.max(1, Math.min(4, score));
};
const STRENGTH = ["", "weak", "fair", "good", "strong"];

const EyeIcon = ({ crossed }) => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
    <path d="M1.75 10S4.75 4.25 10 4.25 18.25 10 18.25 10 15.25 15.75 10 15.75 1.75 10 1.75 10z"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="10" cy="10" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
    {crossed && <path d="M3 17L17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

const Field = ({ label, error, hint, children }) => {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label className="auth-field__label" htmlFor={id}>{label}</label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && <div className="auth-field__hint" id={`${id}-hint`}>{hint}</div>}
      {error && <div className="auth-field__error" id={`${id}-error`}>{error}</div>}
    </div>
  );
};

const PasswordInput = React.forwardRef(({ onCapsLock, ...props }, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const checkCaps = (e) => onCapsLock?.(e.getModifierState?.("CapsLock") ?? false);
  return (
    <div className="auth-input-group">
      <input
        ref={ref}
        {...props}
        className="auth-input"
        type={visible ? "text" : "password"}
        onKeyDown={checkCaps}
        onKeyUp={checkCaps}
        onBlur={(e) => { onCapsLock?.(false); props.onBlur?.(e); }}
      />
      <button
        type="button"
        className="auth-input-group__toggle"
        aria-pressed={visible}
        aria-label={visible ? t("login.hidePassword") : t("login.showPassword")}
        title={visible ? t("login.hidePassword") : t("login.showPassword")}
        onClick={() => setVisible((v) => !v)}
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  );
});

const SubmitButton = ({ pending, children, pendingLabel }) => (
  <button className="auth-submit" type="submit" disabled={pending} aria-busy={pending}>
    {pending && <span className="auth-submit__spinner" aria-hidden="true" />}
    <span>{pending ? pendingLabel : children}</span>
  </button>
);

const Notice = ({ kind, children }) =>
  children ? (
    <div className={`auth-notice auth-notice--${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  ) : null;

// The left panel: the product's own example, a sheet whose columns are grouped into a nested object
const Showcase = () => {
  const { t } = useTranslation();
  const rows = [
    ["Amina Idrissi", "Rabat", "10000"],
    ["Louis Martin", "Lyon", "69001"],
    ["Sara Benali", "Tanger", "90000"],
  ];
  return (
    <aside className="auth-showcase">
      <Link href="/" className="auth-brand">
        {t("nav.logo")}
      </Link>

      <div className="auth-showcase__copy">
        <p className="auth-showcase__headline">{t("login.showcaseTitle")}</p>
        <p className="auth-showcase__text">{t("login.showcaseText")}</p>
      </div>

      <figure className="auth-demo" dir="ltr" aria-label={t("login.showcaseFigure")}>
        <div className="auth-sheet" aria-hidden="true">
          <span className="sheet-corner" />
          {["A", "B", "C"].map((c) => <span key={c} className="sheet-col">{c}</span>)}
          {[["name", "city", "zip"], ...rows].map((row, r) => (
            <React.Fragment key={row[0]}>
              <span className={`sheet-row${r === rows.length ? " sheet-last" : ""}`}>{r + 1}</span>
              {row.map((cell) => (
                <span key={cell} className={[r === 0 && "sheet-head", r === rows.length && "sheet-last"].filter(Boolean).join(" ")}>
                  {cell}
                </span>
              ))}
            </React.Fragment>
          ))}
          <span className="auth-sheet__range">
            <span className="auth-sheet__tag">address</span>
          </span>
        </div>

        <pre className="auth-json" aria-hidden="true">
          <code>
            <span className="l">{"["}</span>
            <span className="l">{"  {"}</span>
            <span className="l">{'    '}<i className="k">"name"</i>{': '}<i className="s">"Amina Idrissi"</i>,</span>
            <span className="l is-new">{'    '}<i className="k">"address"</i>{": {"}</span>
            <span className="l is-new">{'      '}<i className="k">"city"</i>{': '}<i className="s">"Rabat"</i>,</span>
            <span className="l is-new">{'      '}<i className="k">"zip"</i>{': '}<i className="n">10000</i></span>
            <span className="l is-new">{"    }"}</span>
            <span className="l">{"  },"}</span>
            <span className="l c">{"  …"}</span>
            <span className="l">{"]"}</span>
          </code>
        </pre>
      </figure>
    </aside>
  );
};

function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabsId = useId();

  // "/login?sign-up" opens the sign up form, anything else the sign in form
  const mode = searchParams.has("sign-up") ? "signUp" : "signIn";
  // ?next= is the page the user was sent away from; it is kept across tab switches
  const nextParam = searchParams.get("next");
  const setMode = (next) => {
    if (next === mode) return;
    const keep = nextParam ? `&next=${encodeURIComponent(nextParam)}` : "";
    router.replace(`/login?${next === "signUp" ? "sign-up" : "sign-in"}${keep}`, { scroll: false });
  };

  // sign in
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [notice, setNotice] = useState("");

  // sign up
  const [username, setUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPwd, setUserPwd] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const confirmRef = useRef(null);
  const [registerError, setRegisterError] = useState("");
  const [registerPending, setRegisterPending] = useState(false);

  useEffect(() => {
    if (mode === "signIn") emailRef.current?.focus();
    // only on first render: switching tabs must not steal the focus from the tab list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoginError("");
  }, [email, password]);

  useEffect(() => {
    setRegisterError("");
  }, [username, userEmail, userPwd, confirmPassword]);

  const mismatch = confirmPassword !== "" && userPwd !== confirmPassword;
  const score = passwordScore(userPwd);

  const login = (e) => {
    e.preventDefault();
    setNotice("");
    setLoginPending(true);
    // the session is stored by the server in an httpOnly cookie
    axios.post("/api/auth/login", { email, pwd: password }).then((response) => {
      if (!response.data.auth) {
        setLoginError(t("login.errors.loginFailed"));
        return;
      }
      router.replace(safeNext(nextParam));
      router.refresh();
    }).catch((err) => {
      console.log(err);
      if (!err?.response) setLoginError(t("login.errors.noServerResponse"));
      else if (err.response.status === 400) setLoginError(t("login.errors.missingCredentials"));
      else if (err.response.status === 401) setLoginError(t("login.errors.unauthorized"));
      else setLoginError(t("login.errors.loginFailed"));
    }).finally(() => setLoginPending(false));
  };

  const register = (e) => {
    e.preventDefault();
    if (userPwd !== confirmPassword) {
      setConfirmTouched(true);
      confirmRef.current?.focus();
      return;
    }
    setRegisterPending(true);
    axios.post("/api/auth/register", { username, pwd: userPwd, email: userEmail }).then(() => {
      // account created: carry the email over to the sign in form
      setEmail(userEmail);
      setPassword("");
      setUsername("");
      setUserEmail("");
      setUserPwd("");
      setConfirmPassword("");
      setConfirmTouched(false);
      setNotice(t("login.accountCreated"));
      setMode("signIn");
      setTimeout(() => passwordRef.current?.focus(), 0);
    }).catch((err) => {
      console.log(err);
      const code = err?.response?.data?.code;
      if (!err?.response) setRegisterError(t("login.errors.noServerResponse"));
      else if (code === "emailTaken") setRegisterError(t("login.errors.emailTaken"));
      else if (code === "invalidData") setRegisterError(t("login.errors.invalidData", { min: MIN_PASSWORD_LENGTH }));
      else setRegisterError(t("login.errors.registrationFailed"));
    }).finally(() => setRegisterPending(false));
  };

  const onTabKeyDown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next = mode === "signIn" ? "signUp" : "signIn";
    setMode(next);
    document.getElementById(`${tabsId}-${next}`)?.focus();
  };

  const tab = (value, label) => (
    <button
      type="button"
      role="tab"
      id={`${tabsId}-${value}`}
      aria-selected={mode === value}
      aria-controls={`${tabsId}-panel`}
      tabIndex={mode === value ? 0 : -1}
      className="auth-tabs__tab"
      onClick={() => setMode(value)}
      onKeyDown={onTabKeyDown}
    >
      {label}
    </button>
  );

  return (
    <main className="auth">
      <Showcase />

      <section className="auth-main">
        <div className="auth-main__bar">
          <Link href="/" className="auth-brand auth-brand--compact">
            {t("nav.logo")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="auth-card">
          <div className={`auth-tabs is-${mode}`} role="tablist" aria-label={t("login.tabsLabel")}>
            <span className="auth-tabs__indicator" aria-hidden="true" />
            {tab("signIn", t("login.signIn"))}
            {tab("signUp", t("login.createAccount"))}
          </div>

          <div
            key={mode}
            className="auth-panel"
            role="tabpanel"
            id={`${tabsId}-panel`}
            aria-labelledby={`${tabsId}-${mode}`}
          >
            <h1 className="auth-title">{mode === "signIn" ? t("login.signInTitle") : t("login.signUpTitle")}</h1>
            <p className="auth-subtitle">{mode === "signIn" ? t("login.signInSubtitle") : t("login.signUpSubtitle")}</p>

            {mode === "signIn" ? (
              <form className="auth-form" onSubmit={login}>
                <Notice kind="success">{notice}</Notice>
                <Field label={t("login.email")}>
                  {(a11y) => (
                    <input {...a11y} ref={emailRef} className="auth-input" type="email" name="email"
                      autoComplete="email" inputMode="email" required placeholder={t("login.emailPlaceholder")}
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  )}
                </Field>
                <Field label={t("login.password")} hint={capsLock ? t("login.capsLock") : undefined}>
                  {(a11y) => (
                    <PasswordInput {...a11y} ref={passwordRef} name="password" autoComplete="current-password"
                      required value={password} onCapsLock={setCapsLock}
                      onChange={(e) => setPassword(e.target.value)} />
                  )}
                </Field>
                <Notice kind="error">{loginError}</Notice>
                <SubmitButton pending={loginPending} pendingLabel={t("login.signingIn")}>{t("login.signIn")}</SubmitButton>
                <p className="auth-switch">
                  {t("login.noAccount")}{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("signUp")}>{t("login.createAccount")}</button>
                </p>
              </form>
            ) : (
              <form className="auth-form" onSubmit={register}>
                <Field label={t("login.userName")}>
                  {(a11y) => (
                    <input {...a11y} className="auth-input" type="text" name="username" autoComplete="username"
                      required autoCapitalize="none" spellCheck={false}
                      value={username} onChange={(e) => setUsername(e.target.value)} />
                  )}
                </Field>
                <Field label={t("login.email")}>
                  {(a11y) => (
                    <input {...a11y} className="auth-input" type="email" name="email" autoComplete="email"
                      inputMode="email" required placeholder={t("login.emailPlaceholder")}
                      value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                  )}
                </Field>
                <Field
                  label={t("login.password")}
                  hint={capsLock ? t("login.capsLock") : t("login.passwordHint", { min: MIN_PASSWORD_LENGTH })}
                >
                  {(a11y) => (
                    <PasswordInput {...a11y} name="new-password" autoComplete="new-password" required
                      minLength={MIN_PASSWORD_LENGTH} value={userPwd} onCapsLock={setCapsLock}
                      onChange={(e) => setUserPwd(e.target.value)} />
                  )}
                </Field>
                {userPwd && (
                  <div className={`auth-strength is-${STRENGTH[score]}`}>
                    <div className="auth-strength__bars" aria-hidden="true">
                      {[1, 2, 3, 4].map((n) => <span key={n} className={n <= score ? "on" : ""} />)}
                    </div>
                    <span className="auth-strength__label" aria-live="polite">
                      {t(`login.strength.${STRENGTH[score]}`)}
                    </span>
                  </div>
                )}
                <Field
                  label={t("login.confirmPassword")}
                  error={confirmTouched && mismatch ? t("login.errors.passwordsMismatch") : undefined}
                >
                  {(a11y) => (
                    <PasswordInput {...a11y} ref={confirmRef} name="confirm-password" autoComplete="new-password" required
                      value={confirmPassword} onBlur={() => setConfirmTouched(true)}
                      onChange={(e) => setConfirmPassword(e.target.value)} />
                  )}
                </Field>
                <Notice kind="error">{registerError}</Notice>
                <SubmitButton pending={registerPending} pendingLabel={t("login.creatingAccount")}>{t("login.createAccount")}</SubmitButton>
                <p className="auth-switch">
                  {t("login.haveAccount")}{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("signIn")}>{t("login.signIn")}</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
