"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, CloseIcon } from '../Converter/icons'

/** Requests saved in the account: save the current one, open or delete a saved one. */
const RequestsMenu = ({ current, onOpen }) => {
  const { t } = useTranslation()
  const id = useId()
  const panel = useRef(null)
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(null)
  const [name, setName] = useState('')
  const [withBody, setWithBody] = useState(true)
  const [status, setStatus] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/requests')
      if (!r.ok) throw new Error()
      setList((await r.json()).requests)
    } catch {
      setList([])
      setStatus({ kind: 'error', text: t('savedRequests.errors.load') })
    }
  }, [t])

  useEffect(() => {
    if (!open) return
    setStatus(null)
    load()
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !panel.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open, load])

  const save = async (overwrite = false) => {
    const trimmed = name.trim()
    if (!trimmed) return setStatus({ kind: 'error', text: t('savedRequests.errors.name') })
    if (!current.url.trim()) return setStatus({ kind: 'error', text: t('apiTester.errors.emptyUrl') })
    setBusy(true)
    try {
      const r = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          method: current.method,
          url: current.url,
          headers: current.headers.map(({ key, value, on }) => ({ key, value, on })),
          body: withBody ? current.bodyText : '',
          overwrite,
        }),
      })
      if (r.status === 409) return setStatus({ kind: 'confirm', text: t('mappings.replaceQuestion', { name: trimmed }) })
      if (!r.ok) {
        const code = (await r.json().catch(() => ({}))).code
        throw new Error(code === 'tooLarge' || code === 'tooMany' ? code : 'save')
      }
      setStatus({ kind: 'ok', text: t('mappings.saved', { name: trimmed }) })
      load()
    } catch (e) {
      setStatus({ kind: 'error', text: t(`savedRequests.errors.${e.message}`) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/requests/${item.id}`, { method: 'DELETE' })
      if (!r.ok && r.status !== 404) throw new Error()
      setList((l) => l.filter((x) => x.id !== item.id))
      setStatus({ kind: 'ok', text: t('mappings.deleted', { name: item.name }) })
    } catch {
      setStatus({ kind: 'error', text: t('savedRequests.errors.delete') })
    } finally {
      setDeleting(null)
      setBusy(false)
    }
  }

  return (
    <div className="cv-mappings" ref={panel}>
      <button type="button" className="cv-btn cv-btn--quiet cv-btn--small" aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)}>
        <BookmarkIcon />{t('savedRequests.button')}
      </button>

      {open && (
        <div className="cv-pop" id={`${id}-panel`} role="dialog" aria-labelledby={`${id}-title`}>
          <header className="cv-pop__head">
            <h2 className="cv-pop__title" id={`${id}-title`}>{t('savedRequests.title')}</h2>
            <button type="button" className="cv-icon-btn" aria-label={t('apiTester.cancel')} onClick={() => setOpen(false)}><CloseIcon /></button>
          </header>

          <form className="cv-pop__save" onSubmit={(e) => { e.preventDefault(); save(false) }}>
            <label htmlFor={`${id}-name`} className="visually-hidden">{t('savedRequests.name')}</label>
            <input id={`${id}-name`} className="cv-input" value={name} maxLength={80} placeholder={t('savedRequests.name')}
              onChange={(e) => { setName(e.target.value); setStatus(null) }} />
            <button type="submit" className="cv-btn cv-btn--primary cv-btn--small" disabled={busy}>{t('mappings.save')}</button>
          </form>
          <label className="at-pop-check">
            <input type="checkbox" className="cv-check" checked={withBody} onChange={(e) => setWithBody(e.target.checked)} />
            {t('savedRequests.withBody')}
          </label>
          <p className="cv-pop__text">{t('savedRequests.noAuth')}</p>

          {status && (
            <div className={`cv-pop__status is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
              <span>{status.text}</span>
              {status.kind === 'confirm' && (
                <span className="cv-pop__confirm">
                  <button type="button" className="cv-btn cv-btn--small cv-btn--primary" onClick={() => save(true)} disabled={busy}>{t('mappings.replace')}</button>
                  <button type="button" className="cv-btn cv-btn--small" onClick={() => setStatus(null)}>{t('apiTester.cancel')}</button>
                </span>
              )}
            </div>
          )}

          <h3 className="cv-pop__sub">{t('savedRequests.listTitle')}</h3>
          {list === null
            ? <p className="cv-pop__text">{t('loading')}</p>
            : list.length === 0
              ? <p className="cv-pop__text">{t('savedRequests.none')}</p>
              : <ul className="cv-pop__list">
                {list.map((item) => (
                  <li key={item.id} className="cv-pop__item">
                    <span className="cv-pop__item-text">
                      <span className="cv-pop__item-name">{item.name}</span>
                      <span className="cv-pop__item-date" dir="ltr">
                        <span className={`at-method at-method--${item.method.toLowerCase()}`}>{item.method}</span> {item.url}
                      </span>
                    </span>
                    {deleting === item.id
                      ? <span className="cv-pop__confirm">
                        <button type="button" className="cv-btn cv-btn--small cv-btn--danger" onClick={() => remove(item)} disabled={busy}>{t('mappings.delete')}</button>
                        <button type="button" className="cv-btn cv-btn--small" onClick={() => setDeleting(null)}>{t('apiTester.cancel')}</button>
                      </span>
                      : <span className="cv-pop__confirm">
                        <button type="button" className="cv-btn cv-btn--small" onClick={() => { onOpen(item); setName(item.name); setOpen(false) }}>{t('savedRequests.open')}</button>
                        <button type="button" className="cv-icon-btn" aria-label={t('mappings.deleteNamed', { name: item.name })}
                          title={t('mappings.deleteNamed', { name: item.name })} onClick={() => setDeleting(item.id)}><CloseIcon /></button>
                      </span>}
                  </li>
                ))}
              </ul>}
        </div>
      )}
    </div>
  )
}

export default RequestsMenu
