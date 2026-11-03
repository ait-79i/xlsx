"use client";

import React, { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { passwordScore } from '../../utils/password'
import { CloseIcon } from '../Converter/icons'
import Mascot from '../Mascot'
import '../Converter/converter.css'
import './account.css'

const MIN_PASSWORD = 8
const STRENGTH = ['', 'weak', 'fair', 'good', 'strong']

const call = async (url, method = 'GET', body) => {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

const Message = ({ status }) =>
  status ? <p className={`ac-msg is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.text}</p> : null

const isoDay = (d) => new Date(d).toISOString().slice(0, 10)

// ------------------------------------------------------------------ the account as JSON

const Str = ({ children }) => <span className="ac-json__str">"{children}"</span>
const Key = ({ children, htmlFor }) => (
  <><label className="ac-json__key" htmlFor={htmlFor}>"{children}"</label><span className="ac-json__pun">: </span></>
)

/** The profile, shown and edited as the JSON object it is: the values of username and email are inputs. */
const AccountObject = ({ user, counts, onSaved }) => {
  const { t } = useTranslation()
  const id = useId()
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const dirty = username.trim() !== user.username || email.trim().toLowerCase() !== user.email

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const r = await call('/api/account', 'PATCH', { username, email }).catch(() => ({ ok: false, data: {} }))
    setBusy(false)
    if (r.ok) {
      onSaved(r.data.user)
      setUsername(r.data.user.username)
      setEmail(r.data.user.email)
      setStatus({ kind: 'ok', text: t('account.profile.saved') })
    } else {
      setStatus({ kind: 'error', text: t(`account.errors.${r.data.code ?? 'failed'}`, { defaultValue: t('account.errors.failed') }) })
    }
  }

  const reset = () => {
    setUsername(user.username)
    setEmail(user.email)
    setStatus(null)
  }

  return (
    <form className="ac-json" onSubmit={submit} aria-label={t('account.profile.title')}>
      <div className="ac-json__bar">
        <span className="ac-json__file" dir="ltr">account.json</span>
        <span className="ac-json__hint">{t('account.hero.hint')}</span>
      </div>
      <pre className="ac-json__code" dir="ltr"><code>
        <span className="ac-json__line"><span className="ac-json__pun">{'{'}</span></span>
        <span className="ac-json__line ac-json__i1 is-editable">
          <Key htmlFor={`${id}-name`}>username</Key>
          <span className="ac-json__pun">"</span>
          <input id={`${id}-name`} className="ac-json__input" value={username} maxLength={60} required spellCheck="false"
            autoComplete="username" style={{ width: `${Math.max(username.length, 1) + 0.25}ch` }}
            onChange={(e) => { setUsername(e.target.value); setStatus(null) }} />
          <span className="ac-json__pun">",</span>
        </span>
        <span className="ac-json__line ac-json__i1 is-editable">
          <Key htmlFor={`${id}-email`}>email</Key>
          <span className="ac-json__pun">"</span>
          <input id={`${id}-email`} className="ac-json__input" type="email" value={email} maxLength={200} required spellCheck="false"
            autoComplete="email" style={{ width: `${Math.max(email.length, 1) + 0.25}ch` }}
            onChange={(e) => { setEmail(e.target.value); setStatus(null) }} />
          <span className="ac-json__pun">",</span>
        </span>
        <span className="ac-json__line ac-json__i1">
          <span className="ac-json__key">"memberSince"</span><span className="ac-json__pun">: </span><Str>{isoDay(user.createdAt)}</Str><span className="ac-json__pun">,</span>
        </span>
        <span className="ac-json__line ac-json__i1">
          <span className="ac-json__key">"saved"</span><span className="ac-json__pun">{': { '}</span>
          <a className="ac-json__key ac-json__link" href="#saved">"structures"</a><span className="ac-json__pun">: </span>
          <span className="ac-json__num">{counts.mappings}</span><span className="ac-json__pun">, </span>
          <a className="ac-json__key ac-json__link" href="#saved">"requests"</a><span className="ac-json__pun">: </span>
          <span className="ac-json__num">{counts.requests}</span><span className="ac-json__pun">{' }'}</span>
        </span>
        <span className="ac-json__line"><span className="ac-json__pun">{'}'}</span></span>
      </code></pre>
      <div className={`ac-json__foot${dirty ? ' is-dirty' : ''}`}>
        {status
          ? <span className={`ac-json__status is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.text}</span>
          : <span className="ac-json__status">{dirty ? t('account.hero.unsaved') : t('account.hero.clean')}</span>}
        {dirty && (
          <span className="ac-json__actions">
            <button type="button" className="ac-json__btn" onClick={reset}>{t('account.hero.discard')}</button>
            <button type="submit" className="ac-json__btn is-primary" disabled={busy}>{t('account.profile.save')}</button>
          </span>
        )}
      </div>
    </form>
  )
}

// ------------------------------------------------------------------ saved work

const SavedList = ({ title, items, empty, emptyLink, render, onDelete }) => {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState(null)
  return (
    <div className="ac-list">
      <h3 className="ac-list__title">{title} <span className="ac-list__count">{items.length}</span></h3>
      {items.length === 0
        ? <p className="ac-list__empty">{empty} {emptyLink}</p>
        : <ul className="ac-list__items">
          {items.map((item) => (
            <li key={item.id} className="ac-item">
              <div className="ac-item__text">{render(item)}</div>
              {confirm === item.id
                ? <span className="ac-item__confirm">
                  <button type="button" className="cv-btn cv-btn--small cv-btn--danger" onClick={() => { onDelete(item); setConfirm(null) }}>{t('mappings.delete')}</button>
                  <button type="button" className="cv-btn cv-btn--small" onClick={() => setConfirm(null)}>{t('apiTester.cancel')}</button>
                </span>
                : <button type="button" className="cv-icon-btn" aria-label={t('mappings.deleteNamed', { name: item.name })}
                  title={t('mappings.deleteNamed', { name: item.name })} onClick={() => setConfirm(item.id)}><CloseIcon /></button>}
            </li>
          ))}
        </ul>}
    </div>
  )
}

const SavedWork = ({ onCountsChange }) => {
  const { t, i18n } = useTranslation()
  const [structures, setStructures] = useState(null)
  const [requests, setRequests] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [sheet, json, req] = await Promise.all([
        call('/api/mappings?kind=sheet'), call('/api/mappings?kind=json'), call('/api/requests'),
      ])
      if (!sheet.ok || !json.ok || !req.ok) throw new Error()
      setStructures([
        ...sheet.data.mappings.map((m) => ({ ...m, kind: 'sheet' })),
        ...json.data.mappings.map((m) => ({ ...m, kind: 'json' })),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      setRequests(req.data.requests)
    } catch {
      setError(t('account.saved.loadError'))
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const date = (iso) => new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })

  const remove = async (url, list, setList, item, key) => {
    const r = await call(url, 'DELETE').catch(() => ({ ok: false }))
    if (!r.ok && r.status !== 404) return setError(t('account.saved.deleteError', { name: item.name }))
    const next = list.filter((x) => x.id !== item.id)
    setList(next)
    onCountsChange(key, next.length)
  }

  if (error) return <p className="ac-msg is-error" role="alert">{error}</p>
  if (!structures || !requests) return <p className="ac-muted">{t('loading')}</p>

  return (
    <div className="ac-lists">
      <SavedList
        title={t('account.saved.mappings')}
        items={structures}
        empty={t('account.saved.emptyStructures')}
        emptyLink={<Link href="/excel-to-json">{t('nav.excelToJson')}</Link>}
        onDelete={(item) => remove(`/api/mappings/${item.id}`, structures, setStructures, item, 'mappings')}
        render={(item) => (
          <>
            <span className="ac-item__name">{item.name}</span>
            <span className="ac-item__meta">
              <Link href={item.kind === 'sheet' ? '/excel-to-json' : '/json-structure'} className="ac-tag">
                {item.kind === 'sheet' ? t('nav.excelToJson') : t('nav.jsonStructure')}
              </Link>
              {t('mappings.updated', { date: date(item.updatedAt) })}
            </span>
          </>
        )}
      />
      <SavedList
        title={t('account.saved.requests')}
        items={requests}
        empty={t('account.saved.emptyRequests')}
        emptyLink={<Link href="/test-api">{t('nav.testApi')}</Link>}
        onDelete={(item) => remove(`/api/requests/${item.id}`, requests, setRequests, item, 'requests')}
        render={(item) => (
          <>
            <span className="ac-item__name">{item.name}</span>
            <span className="ac-item__meta ac-item__meta--url" dir="ltr">
              <span className={`ac-method is-${item.method.toLowerCase()}`}>{item.method}</span>
              <span className="ac-item__url">{item.url}</span>
            </span>
          </>
        )}
      />
    </div>
  )
}

// ------------------------------------------------------------------ password, deletion

const Password = () => {
  const { t } = useTranslation()
  const id = useId()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const score = passwordScore(next)
  const mismatch = confirm !== '' && confirm !== next

  const submit = async (e) => {
    e.preventDefault()
    if (next.length < MIN_PASSWORD) return setStatus({ kind: 'error', text: t('account.errors.weakPassword', { min: MIN_PASSWORD }) })
    if (next !== confirm) return setStatus({ kind: 'error', text: t('login.errors.passwordsMismatch') })
    setBusy(true)
    const r = await call('/api/account/password', 'POST', { current, next }).catch(() => ({ ok: false, data: {} }))
    setBusy(false)
    if (r.ok) {
      setCurrent(''); setNext(''); setConfirm('')
      setStatus({ kind: 'ok', text: t('account.password.changed') })
    } else {
      setStatus({ kind: 'error', text: t(`account.errors.${r.data.code ?? 'failed'}`, { min: MIN_PASSWORD, defaultValue: t('account.errors.failed') }) })
    }
  }

  return (
    <form className="ac-form" onSubmit={submit}>
      <div className="ac-pw">
        <label className="ac-field">
          <span>{t('account.password.current')}</span>
          <input className="cv-input" type="password" value={current} required autoComplete="current-password"
            onChange={(e) => { setCurrent(e.target.value); setStatus(null) }} />
        </label>
        <label className="ac-field">
          <span>{t('account.password.new')}</span>
          <input className="cv-input" type="password" value={next} required autoComplete="new-password" minLength={MIN_PASSWORD}
            aria-describedby={`${id}-strength`} onChange={(e) => { setNext(e.target.value); setStatus(null) }} />
          <span className="ac-strength" id={`${id}-strength`}>
            <span className={`ac-strength__bar is-${STRENGTH[score] || 'none'}`} aria-hidden="true">
              {[1, 2, 3, 4].map((n) => <span key={n} className={n <= score ? 'is-on' : undefined} />)}
            </span>
            <span className="ac-field__hint">{next ? t(`login.strength.${STRENGTH[score]}`) : t('login.passwordHint', { min: MIN_PASSWORD })}</span>
          </span>
        </label>
        <label className="ac-field">
          <span>{t('login.confirmPassword')}</span>
          <input className="cv-input" type="password" value={confirm} required autoComplete="new-password"
            aria-invalid={mismatch || undefined} onChange={(e) => { setConfirm(e.target.value); setStatus(null) }} />
          {mismatch && <span className="cv-field-error">{t('login.errors.passwordsMismatch')}</span>}
        </label>
      </div>
      <Message status={status} />
      <div className="ac-form__foot ac-form__foot--start">
        <button type="submit" className="cv-btn cv-btn--primary" disabled={busy || !current || !next || !confirm}>{t('account.password.save')}</button>
      </div>
    </form>
  )
}

const DeleteAccount = ({ counts }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [sure, setSure] = useState(false)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const r = await call('/api/account', 'DELETE', { password }).catch(() => ({ ok: false, data: {} }))
    setBusy(false)
    if (r.ok) { window.location.href = '/'; return }
    setStatus({ kind: 'error', text: t(`account.errors.${r.data.code ?? 'failed'}`, { defaultValue: t('account.errors.failed') }) })
  }

  return (
    <>
      <p className="ac-sec__text">{t('account.delete.text', { mappings: counts.mappings, requests: counts.requests })}</p>
      {!open
        ? <button type="button" className="cv-btn ac-danger__open" onClick={() => setOpen(true)}>{t('account.delete.open')}</button>
        : <form className="ac-form ac-danger__form" onSubmit={submit}>
          <label className="ac-field">
            <span>{t('account.delete.password')}</span>
            <input className="cv-input" type="password" value={password} required autoComplete="current-password" autoFocus
              onChange={(e) => { setPassword(e.target.value); setStatus(null) }} />
          </label>
          <label className="ac-check">
            <input type="checkbox" className="cv-check" checked={sure} onChange={(e) => setSure(e.target.checked)} />
            {t('account.delete.confirm')}
          </label>
          <Message status={status} />
          <div className="ac-form__foot ac-form__foot--start">
            <button type="submit" className="cv-btn cv-btn--danger" disabled={!sure || !password || busy}>{t('account.delete.submit')}</button>
            <button type="button" className="cv-btn" onClick={() => { setOpen(false); setPassword(''); setSure(false); setStatus(null) }}>{t('apiTester.cancel')}</button>
          </div>
        </form>}
    </>
  )
}

const Section = ({ id, title, text, tone, children }) => (
  <section className={`ac-sec${tone ? ` ac-sec--${tone}` : ''}`} id={id} aria-labelledby={`${id}-title`}>
    <header className="ac-sec__head">
      <h2 className="ac-sec__title" id={`${id}-title`}>{title}</h2>
      {text && <p className="ac-sec__text">{text}</p>}
    </header>
    <div className="ac-sec__body">{children}</div>
  </section>
)

// ------------------------------------------------------------------ page

const Account = () => {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/account')
      .then((r) => {
        if (r.status === 401) { window.location.href = '/login?sign-in&next=%2Faccount'; return null }
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d) => d && setData(d))
      .catch(() => setError(true))
  }, [])

  if (error) return <div className="cv ac"><p className="cv-banner cv-banner--error" role="alert">{t('account.errors.load')}</p></div>
  if (!data) return (
    <div className="cv ac ac-loading" role="status">
      <Mascot pose="working" motion="sway" className="ac-loading__mascot" />
      <p className="ac-muted">{t('loading')}</p>
    </div>
  )

  const { user, counts } = data
  const setCount = (key, value) => setData((d) => ({ ...d, counts: { ...d.counts, [key]: value } }))

  return (
    <div className="cv ac">
      <header className="ac-hero">
        <div className="ac-hero__inner">
          <div className="ac-hero__who">
            <span className="ac-hero__letter" aria-hidden="true">{user.username.trim().charAt(0).toUpperCase()}</span>
            <h1 className="ac-hero__name">{user.username}</h1>
            <p className="ac-hero__text">{t('account.hero.text')}</p>
          </div>
          <AccountObject user={user} counts={counts} onSaved={(u) => setData((d) => ({ ...d, user: { ...d.user, ...u } }))} />
        </div>
      </header>

      <div className="ac-body">
        <Section id="saved" title={t('account.saved.title')} text={t('account.saved.note')}>
          <SavedWork onCountsChange={setCount} />
        </Section>
        <Section id="security" title={t('account.password.title')} text={t('account.password.text')}>
          <Password />
        </Section>
        <Section id="delete" title={t('account.delete.title')} tone="danger">
          <DeleteAccount counts={counts} />
        </Section>
      </div>
    </div>
  )
}

export default Account
