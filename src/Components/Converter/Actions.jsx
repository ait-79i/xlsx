"use client";

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@/app/app-state'
import { CaretIcon, CheckIcon, CopyIcon, DownloadIcon } from './icons'
import { downloadJsonAsExcel } from '../../utils/excelExport'
import { toCsv, toJsonLines } from '../../utils/output'

export const download = (text, name, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const baseName = (name = 'data') => name.replace(/\.[^.]+$/, '') || 'data'

/** Closes a <details> menu on a click outside of it or on Escape. */
const useDismiss = (ref) => {
  useEffect(() => {
    const close = (e) => {
      const el = ref.current
      if (!el?.open) return
      if (e.type === 'keydown' ? e.key === 'Escape' : !el.contains(e.target)) el.open = false
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [ref])
}

/**
 * Copy, download, send and visualize the result.
 * json: what is delivered (possibly wrapped in a root key); items: the list of objects, for row formats.
 */
const Actions = ({ json, items, fileName, disabled }) => {
  const { t } = useTranslation()
  const { setBodyRequestData, setVisualData } = useAppState()
  const [copied, setCopied] = useState(false)
  const menu = useRef(null)
  useDismiss(menu)
  const name = baseName(fileName)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const other = (fn) => () => {
    fn()
    if (menu.current) menu.current.open = false
  }

  return (
    <div className="cv-actions">
      <button type="button" className="cv-btn" onClick={copy} disabled={disabled} aria-live="polite">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? t('converter.actions.copied') : t('converter.actions.copy')}
      </button>
      <div className="cv-split">
        <button type="button" className="cv-btn cv-btn--primary cv-split__main" disabled={disabled}
          onClick={() => download(JSON.stringify(json, null, 2), `${name}.json`, 'application/json')}>
          <DownloadIcon />{t('converter.actions.downloadJson')}
        </button>
        <details className="cv-menu" ref={menu}>
          <summary className={`cv-btn cv-btn--primary cv-split__more${disabled ? ' is-disabled' : ''}`}
            aria-label={t('converter.actions.otherFormats')} title={t('converter.actions.otherFormats')}
            onClick={(e) => disabled && e.preventDefault()}>
            <CaretIcon open />
          </summary>
          <div className="cv-menu__list" role="menu">
            <button type="button" role="menuitem" className="cv-menu__item"
              onClick={other(() => download(toJsonLines(items), `${name}.jsonl`, 'application/x-ndjson'))}>
              <strong>{t('converter.actions.formats.jsonl')}</strong>
              <span>{t('converter.actions.formats.jsonlHint')}</span>
            </button>
            <button type="button" role="menuitem" className="cv-menu__item"
              onClick={other(() => download(toCsv(items), `${name}.csv`, 'text/csv'))}>
              <strong>{t('converter.actions.formats.csv')}</strong>
              <span>{t('converter.actions.formats.csvHint')}</span>
            </button>
            <button type="button" role="menuitem" className="cv-menu__item"
              onClick={other(() => downloadJsonAsExcel(items, `${name}-json.xlsx`))}>
              <strong>{t('converter.actions.formats.excel')}</strong>
              <span>{t('converter.actions.formats.excelHint')}</span>
            </button>
          </div>
        </details>
      </div>
      <span className="cv-actions__sep" aria-hidden="true" />
      <Link href="/test-api" className={`cv-btn cv-btn--quiet${disabled ? ' is-disabled' : ''}`}
        aria-disabled={disabled || undefined}
        onClick={(e) => (disabled ? e.preventDefault() : setBodyRequestData(json))}>
        {t('converter.actions.send')}
      </Link>
      <Link href="/visualizer" className={`cv-btn cv-btn--quiet${disabled ? ' is-disabled' : ''}`}
        aria-disabled={disabled || undefined}
        onClick={(e) => (disabled ? e.preventDefault() : setVisualData(json))}>
        {t('converter.actions.visualize')}
      </Link>
    </div>
  )
}

export default Actions
