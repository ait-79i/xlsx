"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@/app/app-state'
import { useSessionState } from '../../utils/useSessionState'
import { highlightJson } from '../JsonCode'
import { CheckIcon, CloseIcon, CopyIcon, DownloadIcon } from '../Converter/icons'
import {
  BODY_METHODS,
  DEFAULT_HEADERS,
  METHODS,
  STATUS_TEXT,
  buildHeaders,
  describeJson,
  formatBytes,
  formatMs,
  newRowId,
  normalizeUrl,
  parseJsonBody,
  readBody,
  requestErrors,
  statusTone,
  toCurl,
} from '../../utils/http'
import '../Converter/converter.css'
import './api-tester.css'

const INITIAL = {
  method: 'GET',
  url: '',
  headers: DEFAULT_HEADERS,
  bodyText: '',
  via: 'browser', // browser | server
}
// kept in memory only: credentials are not written to sessionStorage
const NO_AUTH = { type: 'none', token: '', user: '', password: '' }
const HISTORY_SIZE = 12
const HIGHLIGHT_LIMIT = 200_000 // characters; bigger bodies are shown as plain text

const hostOf = (url) => {
  try { return new URL(url).host } catch { return url }
}

const download = (text, name, type) => {
  const href = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

const useCopy = () => {
  const [copied, setCopied] = useState(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied(null)
    }
  }
  return [copied, copy]
}

// ------------------------------------------------------------------ request side

const Tabs = ({ tabs, value, onChange, label }) => {
  const id = useId()
  const onKey = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = tabs.findIndex((tab) => tab.id === value)
    const next = tabs[(i + step + tabs.length) % tabs.length].id
    onChange(next)
    document.getElementById(`${id}-${next}`)?.focus()
  }
  return (
    <div className="cv-views" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((tab) => (
        <button key={tab.id} id={`${id}-${tab.id}`} type="button" role="tab" className="cv-views__tab"
          aria-selected={value === tab.id} tabIndex={value === tab.id ? 0 : -1} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.badge !== undefined && <span className="at-badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  )
}

const BodyEditor = ({ req, update, imported, onRestore, error }) => {
  const { t } = useTranslation()
  const sendsBody = BODY_METHODS.includes(req.method)
  const parsed = useMemo(() => parseJsonBody(req.bodyText), [req.bodyText])
  const info = parsed.ok && parsed.value !== undefined ? describeJson(parsed.value) : null

  const format = () => {
    if (parsed.ok && parsed.value !== undefined) update({ bodyText: JSON.stringify(parsed.value, null, 2) })
  }

  return (
    <div className="at-body">
      <div className="at-toolbar">
        <span className="at-toolbar__info">
          {!sendsBody
            ? t('apiTester.body.notSent', { method: req.method })
            : info
              ? t(`apiTester.body.${info.kind}`, { count: info.count })
              : t('apiTester.body.empty')}
        </span>
        <button type="button" className="cv-link" onClick={format} disabled={!parsed.ok}>{t('apiTester.body.format')}</button>
        {imported && <button type="button" className="cv-link" onClick={onRestore}>{t('apiTester.body.restore')}</button>}
        {req.bodyText !== '' && <button type="button" className="cv-link" onClick={() => update({ bodyText: '' })}>{t('common.clear')}</button>}
      </div>
      <div className={`at-editor${sendsBody ? '' : ' is-idle'}${error ? ' has-error' : ''}`} dir="ltr">
        <CodeMirror
          value={req.bodyText}
          height="100%"
          extensions={[javascript({ json: true })]}
          basicSetup={{ foldGutter: true, highlightActiveLine: false }}
          placeholder={t('apiTester.body.placeholder')}
          onChange={(value) => update({ bodyText: value })}
        />
      </div>
      {!parsed.ok && (
        <p className="cv-field-error at-body__error" role="alert">
          {parsed.line ? t('apiTester.errors.bodyAt', { line: parsed.line, column: parsed.column }) : t('apiTester.errors.invalidBody')}
        </p>
      )}
    </div>
  )
}

const HeadersEditor = ({ req, update }) => {
  const { t } = useTranslation()
  const rows = req.headers
  const setRow = (id, patch) => update({ headers: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const addRow = () => update({ headers: [...rows, { id: newRowId(), on: true, key: '', value: '' }] })
  const removeRow = (id) => update({ headers: rows.filter((r) => r.id !== id) })

  return (
    <div className="at-headers">
      <table className="at-kv">
        <thead>
          <tr>
            <th className="at-kv__on"><span className="visually-hidden">{t('apiTester.headers.send')}</span></th>
            <th>{t('apiTester.headers.name')}</th>
            <th>{t('apiTester.headers.value')}</th>
            <th className="at-kv__tool" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.on ? undefined : 'is-off'}>
              <td className="at-kv__on">
                <input type="checkbox" className="cv-check" checked={row.on}
                  aria-label={t('apiTester.headers.sendHeader', { name: row.key || '…' })}
                  onChange={(e) => setRow(row.id, { on: e.target.checked })} />
              </td>
              <td>
                <input className="cv-input cv-input--key at-kv__input" value={row.key} dir="ltr" spellCheck="false"
                  placeholder="X-Api-Key" aria-label={t('apiTester.headers.name')}
                  onChange={(e) => setRow(row.id, { key: e.target.value })} />
              </td>
              <td>
                <input className="cv-input cv-input--key at-kv__input" value={row.value} dir="ltr" spellCheck="false"
                  aria-label={t('apiTester.headers.valueOf', { name: row.key || '…' })}
                  onChange={(e) => setRow(row.id, { value: e.target.value })} />
              </td>
              <td className="at-kv__tool">
                <button type="button" className="cv-icon-btn" title={t('apiTester.headers.remove', { name: row.key || '…' })}
                  aria-label={t('apiTester.headers.remove', { name: row.key || '…' })} onClick={() => removeRow(row.id)}>
                  <CloseIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="at-toolbar">
        <button type="button" className="cv-btn cv-btn--small" onClick={addRow}>{t('apiTester.headers.add')}</button>
        <span className="at-toolbar__info">{t('apiTester.headers.note')}</span>
      </div>
    </div>
  )
}

const AuthEditor = ({ auth, setAuth }) => {
  const { t } = useTranslation()
  const id = useId()
  const set = (patch) => setAuth({ ...auth, ...patch })
  return (
    <div className="at-auth">
      <fieldset className="at-choice">
        <legend className="at-choice__legend">{t('apiTester.auth.type')}</legend>
        {['none', 'bearer', 'basic'].map((type) => (
          <label key={type} className="at-choice__item">
            <input type="radio" name={`${id}-auth`} checked={auth.type === type} onChange={() => set({ type })} />
            {t(`apiTester.auth.${type}`)}
          </label>
        ))}
      </fieldset>
      {auth.type === 'bearer' && (
        <label className="at-field">
          <span>{t('apiTester.auth.token')}</span>
          <input className="cv-input cv-input--key" value={auth.token} dir="ltr" spellCheck="false" autoComplete="off"
            onChange={(e) => set({ token: e.target.value })} />
        </label>
      )}
      {auth.type === 'basic' && (
        <div className="at-auth__pair">
          <label className="at-field">
            <span>{t('apiTester.auth.user')}</span>
            <input className="cv-input" value={auth.user} dir="ltr" autoComplete="off" onChange={(e) => set({ user: e.target.value })} />
          </label>
          <label className="at-field">
            <span>{t('apiTester.auth.password')}</span>
            <input className="cv-input" type="password" value={auth.password} dir="ltr" autoComplete="new-password"
              onChange={(e) => set({ password: e.target.value })} />
          </label>
        </div>
      )}
      <p className="at-toolbar__info">{auth.type === 'none' ? t('apiTester.auth.noneNote') : t('apiTester.auth.note')}</p>
    </div>
  )
}

// ------------------------------------------------------------------ response side

const ResponseView = ({ res, onRetryServer, history, onPickHistory, sending, elapsed, onCancel }) => {
  const { t } = useTranslation()
  const { setVisualData } = useAppState()
  const [tab, setTab] = useState('body')
  const [copied, copy] = useCopy()

  if (sending) {
    return (
      <div className="at-wait" role="status">
        <span className="at-wait__dot" aria-hidden="true" />
        <p>{t('apiTester.response.waiting', { host: hostOf(sending), time: formatMs(elapsed) })}</p>
        <button type="button" className="cv-btn cv-btn--small" onClick={onCancel}>{t('apiTester.cancel')}</button>
      </div>
    )
  }

  if (!res) {
    return (
      <div className="at-idle">
        <p className="at-idle__title">{t('apiTester.response.idleTitle')}</p>
        <p className="at-idle__text">{t('apiTester.response.idleText')}</p>
        {history.length > 0 && (
          <>
            <h3 className="at-idle__sub">{t('apiTester.history.title')}</h3>
            <ul className="at-history">
              {history.map((h) => (
                <li key={h.id}>
                  <button type="button" className="at-history__item" onClick={() => onPickHistory(h)}>
                    <span className={`at-method at-method--${h.method.toLowerCase()}`}>{h.method}</span>
                    <span className="at-history__url" dir="ltr">{h.url}</span>
                    {h.status
                      ? <span className={`at-history__status is-${statusTone(h.status)}`}>{h.status}</span>
                      : <span className="at-history__status is-server">{t('apiTester.history.failed')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  if (res.error) {
    const host = hostOf(res.url)
    return (
      <div className="at-fail" role="alert">
        <p className="at-fail__title">{t(`apiTester.failure.${res.error}.title`, { host })}</p>
        <p className="at-fail__text">{t(`apiTester.failure.${res.error}.text`, { host })}</p>
        {res.error === 'network' && res.via === 'browser' && (
          <button type="button" className="cv-btn cv-btn--primary" onClick={onRetryServer}>{t('apiTester.failure.network.retry')}</button>
        )}
      </div>
    )
  }

  const tone = statusTone(res.status)
  const statusText = res.statusText || STATUS_TEXT[res.status] || ''
  const isJson = res.body.json !== undefined
  const text = isJson ? JSON.stringify(res.body.json, null, 2) : res.body.text
  const canVisualize = isJson && res.body.json !== null && typeof res.body.json === 'object'

  return (
    <div className="at-res">
      <div className={`at-status is-${tone}`}>
        <span className="at-status__code">{res.status}</span>
        <span className="at-status__text">{statusText}</span>
        <span className="at-status__meta">
          {formatMs(res.ms)}, {formatBytes(res.size)}, {t(`apiTester.response.via.${res.via}`)}
        </span>
      </div>

      <div className="at-res__bar">
        <Tabs label={t('apiTester.response.title')} value={tab} onChange={setTab} tabs={[
          { id: 'body', label: t('apiTester.response.body') },
          { id: 'headers', label: t('apiTester.response.headers'), badge: res.headers.length },
        ]} />
        <div className="at-res__actions">
          <button type="button" className="cv-btn cv-btn--small" onClick={() => copy('body', text)} disabled={text === ''}>
            {copied === 'body' ? <CheckIcon /> : <CopyIcon />}{copied === 'body' ? t('converter.actions.copied') : t('common.copy')}
          </button>
          <button type="button" className="cv-btn cv-btn--small" disabled={text === ''}
            onClick={() => download(text, isJson ? 'response.json' : 'response.txt', isJson ? 'application/json' : 'text/plain')}>
            <DownloadIcon />{t('common.download')}
          </button>
          {canVisualize && (
            <Link href="/visualizer" className="cv-btn cv-btn--small cv-btn--primary" onClick={() => setVisualData(res.body.json)}>
              {t('apiTester.response.visualize')}
            </Link>
          )}
        </div>
      </div>

      {tab === 'body'
        ? text === ''
          ? <p className="at-res__empty">{t('apiTester.response.noBody')}</p>
          : <>
            {res.truncated && <p className="cv-note">{t('apiTester.response.truncated')}</p>}
            <pre className="cv-code at-res__code" dir="ltr" tabIndex={0}>
              <code>{isJson && text.length <= HIGHLIGHT_LIMIT ? highlightJson(text) : text}</code>
            </pre>
          </>
        : <div className="at-res__headers">
          {res.via === 'browser' && <p className="cv-note">{t('apiTester.response.browserHeaders')}</p>}
          <table className="at-kv at-kv--read">
            <tbody>
              {res.headers.map(([k, v], i) => (
                <tr key={i}><th scope="row" dir="ltr">{k}</th><td dir="ltr">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>}
    </div>
  )
}

// ------------------------------------------------------------------ page

const ApiTester = () => {
  const { t } = useTranslation()
  const { bodyRequestData, setBodyRequestData } = useAppState()
  const [req, setReq] = useSessionState('apiRequest', INITIAL)
  const [history, setHistory] = useSessionState('apiHistory', [])
  const [auth, setAuth] = useState(NO_AUTH)
  const [imported, setImported] = useState(null) // JSON text received from another page
  const [tab, setTab] = useState('body')
  const [res, setRes] = useState(null)
  const [sending, setSending] = useState(null) // url being requested
  const [elapsed, setElapsed] = useState(0)
  const [errors, setErrors] = useState({})
  const [copied, copy] = useCopy()
  const abort = useRef(null)
  const urlInput = useRef(null)
  const id = useId()

  const update = useCallback((patch) => {
    setReq((r) => ({ ...r, ...patch }))
    setErrors((e) => {
      if (!Object.keys(e).length) return e
      const next = { ...e }
      if ('url' in patch) delete next.url
      if ('bodyText' in patch || 'method' in patch) delete next.body
      return next
    })
  }, [setReq])

  // data sent from Excel to JSON or JSON structure: it becomes the body, once
  useEffect(() => {
    if (bodyRequestData === null || bodyRequestData === undefined) return
    const text = JSON.stringify(bodyRequestData, null, 2)
    setImported(text)
    setReq((r) => ({ ...r, bodyText: text, method: BODY_METHODS.includes(r.method) ? r.method : 'POST' }))
    setTab('body')
    setBodyRequestData(null)
  }, [bodyRequestData, setBodyRequestData, setReq])

  const hasBody = BODY_METHODS.includes(req.method) && req.bodyText.trim() !== ''
  const headers = useMemo(() => buildHeaders(req.headers, auth, { hasBody }), [req.headers, auth, hasBody])

  const send = useCallback(async (via = req.via) => {
    const found = requestErrors(req)
    setErrors(found)
    if (found.url) { urlInput.current?.focus(); return }
    if (found.body) { setTab('body'); return }

    const url = normalizeUrl(req.url)
    if (url !== req.url) update({ url })
    const body = hasBody ? JSON.stringify(parseJsonBody(req.bodyText).value) : undefined
    const controller = new AbortController()
    abort.current = controller
    setSending(url)
    setRes(null)
    const started = performance.now()
    const record = (status) => setHistory((h) => [
      { id: newRowId(), method: req.method, url, status },
      ...h.filter((x) => !(x.method === req.method && x.url === url)),
    ].slice(0, HISTORY_SIZE))

    try {
      let result
      if (via === 'server') {
        const r = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: req.method, url, headers, body }),
          signal: controller.signal,
        })
        const data = await r.json().catch(() => ({ error: 'unreachable' }))
        if (r.status === 401) { window.location.href = `/login?sign-in&next=${encodeURIComponent('/test-api')}`; return }
        if (data.error) throw Object.assign(new Error(data.error), { code: data.error })
        const contentType = data.headers.find(([k]) => k.toLowerCase() === 'content-type')?.[1] ?? ''
        result = { ...data, body: readBody(data.body, contentType) }
      } else {
        const r = await fetch(url, { method: req.method, headers, body, signal: controller.signal })
        const raw = await r.text()
        result = {
          status: r.status,
          statusText: r.statusText,
          headers: [...r.headers.entries()],
          body: readBody(raw, r.headers.get('content-type') ?? ''),
          size: new TextEncoder().encode(raw).length,
          ms: performance.now() - started,
        }
      }
      setRes({ ...result, via, url })
      record(result.status)
    } catch (e) {
      const code = e.name === 'AbortError' ? 'aborted' : e.code ?? 'network'
      setRes({ error: code, via, url })
      if (code !== 'aborted') record(null)
    } finally {
      setSending(null)
      abort.current = null
    }
  }, [req, headers, hasBody, update, setHistory])

  // elapsed time while waiting
  useEffect(() => {
    if (!sending) return
    const started = performance.now()
    const timer = setInterval(() => setElapsed(performance.now() - started), 100)
    return () => { clearInterval(timer); setElapsed(0) }
  }, [sending])

  // Ctrl+Enter / Cmd+Enter sends from anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!sending) send()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [send, sending])

  const activeHeaders = Object.keys(headers).length
  const curl = () => copy('curl', toCurl({
    method: req.method,
    url: normalizeUrl(req.url) ?? req.url,
    headers,
    body: hasBody ? req.bodyText : undefined,
  }))

  return (
    <div className="cv at">
      <form className="at-line" onSubmit={(e) => { e.preventDefault(); sending ? abort.current?.abort() : send() }}>
        <h1 className="visually-hidden">{t('nav.testApi')}</h1>
        <label className="visually-hidden" htmlFor={`${id}-method`}>{t('apiTester.method')}</label>
        <select id={`${id}-method`} className={`at-line__method at-method--${req.method.toLowerCase()}`} value={req.method}
          onChange={(e) => update({ method: e.target.value })}>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label className="visually-hidden" htmlFor={`${id}-url`}>{t('apiTester.url')}</label>
        <input
          ref={urlInput}
          id={`${id}-url`}
          className="at-line__url"
          value={req.url}
          dir="ltr"
          spellCheck="false"
          autoComplete="url"
          inputMode="url"
          placeholder="https://api.example.com/customers"
          aria-invalid={errors.url ? true : undefined}
          aria-describedby={errors.url ? `${id}-url-err` : `${id}-hint`}
          onChange={(e) => update({ url: e.target.value })}
        />
        <button type="submit" className={`cv-btn at-line__send${sending ? '' : ' cv-btn--primary'}`}>
          {sending ? t('apiTester.cancel') : t('apiTester.send')}
        </button>
      </form>

      <div className="at-under">
        {errors.url
          ? <p className="cv-field-error" id={`${id}-url-err`} role="alert">{t(`apiTester.errors.${errors.url}`)}</p>
          : <p className="at-under__hint" id={`${id}-hint`}>{t('apiTester.hint')}</p>}
        <fieldset className="at-via">
          <legend>{t('apiTester.via.label')}</legend>
          {['browser', 'server'].map((via) => (
            <label key={via} className={req.via === via ? 'is-on' : undefined} title={t(`apiTester.via.${via}Title`)}>
              <input type="radio" name={`${id}-via`} checked={req.via === via} onChange={() => update({ via })} />
              {t(`apiTester.via.${via}`)}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="at-grid">
        <section className="cv-panel at-req" aria-label={t('apiTester.request')}>
          <header className="cv-panel__head at-panel-head">
            <Tabs label={t('apiTester.request')} value={tab} onChange={setTab} tabs={[
              { id: 'body', label: t('apiTester.tabs.body') },
              { id: 'headers', label: t('apiTester.tabs.headers'), badge: activeHeaders },
              { id: 'auth', label: t('apiTester.tabs.auth'), badge: auth.type === 'none' ? undefined : '1' },
            ]} />
            <button type="button" className="cv-btn cv-btn--quiet cv-btn--small" onClick={curl}>
              {copied === 'curl' ? <CheckIcon /> : <CopyIcon />}
              {copied === 'curl' ? t('converter.actions.copied') : t('apiTester.copyCurl')}
            </button>
          </header>
          {imported && tab === 'body' && req.bodyText === imported && (
            <p className="at-imported">{t('apiTester.body.imported')}</p>
          )}
          <div className="at-req__body">
            {tab === 'body' && <BodyEditor req={req} update={update} imported={imported} error={errors.body}
              onRestore={() => update({ bodyText: imported })} />}
            {tab === 'headers' && <HeadersEditor req={req} update={update} />}
            {tab === 'auth' && <AuthEditor auth={auth} setAuth={setAuth} />}
          </div>
        </section>

        <section className="cv-panel at-resp" aria-label={t('apiTester.response.title')} aria-busy={!!sending}>
          <ResponseView
            res={res}
            sending={sending}
            elapsed={elapsed}
            onCancel={() => abort.current?.abort()}
            onRetryServer={() => { update({ via: 'server' }); send('server') }}
            history={history}
            onPickHistory={(h) => update({ method: h.method, url: h.url })}
          />
        </section>
      </div>
    </div>
  )
}

export default ApiTester
