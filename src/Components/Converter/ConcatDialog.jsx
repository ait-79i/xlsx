"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon, GripIcon, LeftIcon, RightIcon } from './icons'
import { SEPARATORS, concatValues } from '../../utils/converter'

// a space is invisible: show it
const showSeparator = (sep) => (sep === '' ? '' : sep.replace(/ /g, '␣'))
const SEPARATOR_NAMES = { ' ': 'space', ', ': 'comma', ' - ': 'dash', '/': 'slash', '_': 'underscore', '': 'none' }

const display = (v) => {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return null
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
}

/**
 * Combine keys into one: name, order of the parts, separator, empty values, with a live preview.
 * draft: { mode: 'create'|'edit', parts: [{ id, key }], key, separator, skipEmpty }
 * sample(parts) -> rows of values (first rows of the data) for the preview
 * onSubmit({ key, separator, skipEmpty, order }) -> error text or null
 */
const ConcatDialog = ({ draft, sample, onSubmit, onClose }) => {
  const { t } = useTranslation()
  const id = useId()
  const dialog = useRef(null)
  const [parts, setParts] = useState(draft.parts)
  const [key, setKey] = useState(draft.key)
  const [separator, setSeparator] = useState(draft.separator)
  const [custom, setCustom] = useState(SEPARATORS.includes(draft.separator) ? '' : draft.separator)
  const [skipEmpty, setSkipEmpty] = useState(draft.skipEmpty)
  const [error, setError] = useState('')
  const [dragged, setDragged] = useState(null)
  const [isCustom, setIsCustom] = useState(!SEPARATORS.includes(draft.separator))

  // no close() on cleanup: the dialog closes when it leaves the page, and a close event here
  // would tell the parent to drop the dialog (React runs effects twice in development)
  useEffect(() => {
    const el = dialog.current
    if (el && !el.open) el.showModal()
  }, [])

  const rows = useMemo(() => sample(parts), [sample, parts])

  const move = (from, to) => {
    if (to < 0 || to >= parts.length || from === to) return
    setParts((list) => {
      const next = [...list]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const submit = (e) => {
    e.preventDefault()
    const result = onSubmit({ key, separator, skipEmpty, order: parts.map((p) => p.id) })
    if (result) setError(result)
  }

  return (
    <dialog ref={dialog} className="cv-dialog" aria-labelledby={`${id}-title`} onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose() }}>
      <form className="cv-dialog__body" onSubmit={submit}>
        <header className="cv-dialog__head">
          <h2 id={`${id}-title`} className="cv-dialog__title">
            {draft.mode === 'edit' ? t('converter.concat.editTitle') : t('converter.concat.title')}
          </h2>
          <button type="button" className="cv-icon-btn" aria-label={t('apiTester.cancel')} onClick={onClose}><CloseIcon /></button>
        </header>

        <label className="cv-dialog__field">
          <span className="cv-dialog__label">{draft.mode === 'edit' ? t('converter.concat.keyEdit') : t('converter.concat.key')}</span>
          <input className="cv-input cv-input--key" value={key} dir="ltr" spellCheck="false" autoComplete="off" autoFocus
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => { setKey(e.target.value); setError('') }} />
          {error && <span className="cv-field-error" id={`${id}-err`} role="alert">{error}</span>}
        </label>

        <div className="cv-dialog__field">
          <span className="cv-dialog__label" id={`${id}-order`}>{t('converter.concat.order')}</span>
          <ol className="cv-parts" dir="ltr" aria-labelledby={`${id}-order`}>
            {parts.map((part, i) => (
              <React.Fragment key={part.id}>
                {i > 0 && <li className="cv-parts__sep" aria-hidden="true">{showSeparator(separator) || '·'}</li>}
                <li
                  className={`cv-part${dragged === i ? ' is-dragged' : ''}`}
                  draggable
                  onDragStart={(e) => { setDragged(i); e.dataTransfer.effectAllowed = 'move' }}
                  onDragOver={(e) => { e.preventDefault(); if (dragged !== null && dragged !== i) { move(dragged, i); setDragged(i) } }}
                  onDragEnd={() => setDragged(null)}
                >
                  <span className="cv-part__grip" aria-hidden="true"><GripIcon /></span>
                  <span className="cv-part__key">{part.key}</span>
                  <span className="cv-part__tools">
                    <button type="button" className="cv-icon-btn" disabled={i === 0} onClick={() => move(i, i - 1)}
                      aria-label={t('converter.concat.moveBefore', { key: part.key })}><LeftIcon /></button>
                    <button type="button" className="cv-icon-btn" disabled={i === parts.length - 1} onClick={() => move(i, i + 1)}
                      aria-label={t('converter.concat.moveAfter', { key: part.key })}><RightIcon /></button>
                  </span>
                </li>
              </React.Fragment>
            ))}
          </ol>
          <span className="cv-dialog__hint">{t('converter.concat.orderHint')}</span>
        </div>

        <fieldset className="cv-dialog__field cv-seps">
          <legend className="cv-dialog__label">{t('converter.concat.separator')}</legend>
          <div className="cv-seps__list">
            {SEPARATORS.map((sep) => (
              <label key={SEPARATOR_NAMES[sep]} className={`cv-sep${!isCustom && separator === sep ? ' is-on' : ''}`}>
                <input type="radio" name={`${id}-sep`} checked={!isCustom && separator === sep} onChange={() => { setSeparator(sep); setIsCustom(false) }} />
                <span className="cv-sep__glyph" dir="ltr" aria-hidden="true">{sep === '' ? '∅' : showSeparator(sep)}</span>
                <span className="cv-sep__name">{t(`converter.concat.separators.${SEPARATOR_NAMES[sep]}`)}</span>
              </label>
            ))}
            <label className={`cv-sep cv-sep--custom${isCustom ? ' is-on' : ''}`}>
              <input type="radio" name={`${id}-sep`} checked={isCustom} onChange={() => { setSeparator(custom); setIsCustom(true) }} />
              <span className="cv-sep__name">{t('converter.concat.separators.custom')}</span>
              <input className="cv-input cv-input--key cv-sep__input" value={custom} dir="ltr" spellCheck="false"
                placeholder=" | " aria-label={t('converter.concat.separators.customLabel')}
                onFocus={() => { setSeparator(custom); setIsCustom(true) }}
                onChange={(e) => { setCustom(e.target.value); setSeparator(e.target.value) }} />
            </label>
          </div>
        </fieldset>

        <label className="cv-dialog__check">
          <input type="checkbox" className="cv-check" checked={skipEmpty} onChange={(e) => setSkipEmpty(e.target.checked)} />
          <span>
            {t('converter.concat.skipEmpty')}
            <span className="cv-dialog__hint">{t('converter.concat.skipEmptyHint')}</span>
          </span>
        </label>

        <div className="cv-dialog__field">
          <span className="cv-dialog__label">{t('converter.concat.preview')}</span>
          <ul className="cv-concat-preview" dir="ltr">
            {rows.map((values, r) => {
              const result = concatValues(values, { separator, skipEmpty })
              return (
                <li key={r} className="cv-concat-preview__row">
                  <span className="cv-concat-preview__tokens">
                    {values.map((v, i) => {
                      const text = display(v)
                      const shown = !(skipEmpty && text === null)
                      const firstShown = values.slice(0, i).some((x) => !(skipEmpty && display(x) === null))
                      return (
                        <React.Fragment key={i}>
                          {shown && firstShown && separator !== '' && <span className="cv-token cv-token--sep">{showSeparator(separator)}</span>}
                          <span className={`cv-token${text === null ? ' is-empty' : ''}`}>{text ?? t('converter.concat.empty')}</span>
                        </React.Fragment>
                      )
                    })}
                  </span>
                  <span className="cv-concat-preview__result">
                    {result === null ? <em>null</em> : JSON.stringify(result)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="cv-dialog__foot">
          <button type="button" className="cv-btn" onClick={onClose}>{t('apiTester.cancel')}</button>
          <button type="submit" className="cv-btn cv-btn--primary">
            {draft.mode === 'edit' ? t('converter.concat.save') : t('converter.concat.combine')}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

export default ConcatDialog
