"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkIcon, CloseIcon } from './icons'

/**
 * Saved structures of the signed in user: save the current one, apply or delete a saved one.
 * getData() -> what to store; onApply(data, name) applies a saved structure.
 */
const MappingsMenu = ({ kind, getData, onApply, defaultName = '', disabled }) => {
  const { t, i18n } = useTranslation()
  const id = useId()
  const panel = useRef(null)
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState(null) // { kind: 'ok'|'error'|'confirm', text }
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/mappings?kind=${kind}`)
      if (!r.ok) throw new Error()
      setList((await r.json()).mappings)
    } catch {
      setList([])
      setStatus({ kind: 'error', text: t('mappings.errors.load') })
    }
  }, [kind, t])

  useEffect(() => {
    if (!open) return
    setName((n) => n || defaultName)
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
  }, [open, load, defaultName])

  const save = async (overwrite = false) => {
    const trimmed = name.trim()
    if (!trimmed) return setStatus({ kind: 'error', text: t('mappings.errors.name') })
    setBusy(true)
    try {
      const r = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name: trimmed, data: getData(), overwrite }),
      })
      if (r.status === 409) return setStatus({ kind: 'confirm', text: t('mappings.replaceQuestion', { name: trimmed }) })
      if (!r.ok) {
        const code = (await r.json().catch(() => ({}))).code
        throw new Error(code === 'tooLarge' || code === 'tooMany' ? code : 'save')
      }
      setStatus({ kind: 'ok', text: t('mappings.saved', { name: trimmed }) })
      load()
    } catch (e) {
      setStatus({ kind: 'error', text: t(`mappings.errors.${e.message}`) })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (mapping) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/mappings/${mapping.id}`, { method: 'DELETE' })
      if (!r.ok && r.status !== 404) throw new Error()
      setList((l) => l.filter((m) => m.id !== mapping.id))
      setStatus({ kind: 'ok', text: t('mappings.deleted', { name: mapping.name }) })
    } catch {
      setStatus({ kind: 'error', text: t('mappings.errors.delete') })
    } finally {
      setDeleting(null)
      setBusy(false)
    }
  }

  const date = (iso) => new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="cv-mappings" ref={panel}>
      <button type="button" className="cv-btn cv-btn--quiet" aria-expanded={open} aria-controls={`${id}-panel`}
        onClick={() => setOpen((o) => !o)} disabled={disabled}>
        <BookmarkIcon />{t('mappings.button')}
      </button>

      {open && (
        <div className="cv-pop" id={`${id}-panel`} role="dialog" aria-labelledby={`${id}-title`}>
          <header className="cv-pop__head">
            <h2 className="cv-pop__title" id={`${id}-title`}>{t('mappings.title')}</h2>
            <button type="button" className="cv-icon-btn" aria-label={t('apiTester.cancel')} onClick={() => setOpen(false)}><CloseIcon /></button>
          </header>
          <p className="cv-pop__text">{t(`mappings.help.${kind}`)}</p>

          <form className="cv-pop__save" onSubmit={(e) => { e.preventDefault(); save(false) }}>
            <label htmlFor={`${id}-name`} className="visually-hidden">{t('mappings.name')}</label>
            <input id={`${id}-name`} className="cv-input" value={name} maxLength={80} placeholder={t('mappings.name')}
              onChange={(e) => { setName(e.target.value); setStatus(null) }} />
            <button type="submit" className="cv-btn cv-btn--primary cv-btn--small" disabled={busy}>{t('mappings.save')}</button>
          </form>

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

          <h3 className="cv-pop__sub">{t('mappings.savedTitle')}</h3>
          {list === null
            ? <p className="cv-pop__text">{t('loading')}</p>
            : list.length === 0
              ? <p className="cv-pop__text">{t('mappings.none')}</p>
              : <ul className="cv-pop__list">
                {list.map((m) => (
                  <li key={m.id} className="cv-pop__item">
                    <span className="cv-pop__item-text">
                      <span className="cv-pop__item-name">{m.name}</span>
                      <span className="cv-pop__item-date">{t('mappings.updated', { date: date(m.updatedAt) })}</span>
                    </span>
                    {deleting === m.id
                      ? <span className="cv-pop__confirm">
                        <button type="button" className="cv-btn cv-btn--small cv-btn--danger" onClick={() => remove(m)} disabled={busy}>{t('mappings.delete')}</button>
                        <button type="button" className="cv-btn cv-btn--small" onClick={() => setDeleting(null)}>{t('apiTester.cancel')}</button>
                      </span>
                      : <span className="cv-pop__confirm">
                        <button type="button" className="cv-btn cv-btn--small" onClick={() => { onApply(m.data, m.name); setOpen(false) }}>{t('mappings.apply')}</button>
                        <button type="button" className="cv-icon-btn" aria-label={t('mappings.deleteNamed', { name: m.name })}
                          title={t('mappings.deleteNamed', { name: m.name })} onClick={() => setDeleting(m.id)}><CloseIcon /></button>
                      </span>}
                  </li>
                ))}
              </ul>}
        </div>
      )}
    </div>
  )
}

export default MappingsMenu
