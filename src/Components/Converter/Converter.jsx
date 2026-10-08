"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Sheet from './Sheet'
import KeysPanel from './KeysPanel'
import Preview from './Preview'
import { CheckIcon, CopyIcon, DownloadIcon, FileIcon, UndoIcon } from './icons'
import {
  EXCEL_EXTENSIONS,
  buildJson,
  fieldsBySource,
  groupNodes,
  includedCount,
  initialShape,
  isSpreadsheetFile,
  concatNodes,
  moveNode,
  moveOut,
  splitConcat,
  updateConcat,
  readWorkbook,
  renameNode,
  setIncluded,
  ungroupNode,
} from '../../utils/converter'
import { downloadJsonAsExcel } from '../../utils/excelExport'
import { useSessionState } from '../../utils/useSessionState'
import { useAppState } from '@/app/app-state'
import './converter.css'

const SAMPLE = {
  fileName: 'customers-sample.xlsx',
  sheets: [{
    name: 'Customers',
    columns: ['id', 'name', 'email', 'street', 'city', 'zip', 'plan', 'joined'].map((name, i) => ({ name, letter: String.fromCharCode(65 + i) })),
    rows: [
      [1, 'Amina Benali', 'amina@atlas.ma', '12 Rue Allal', 'Casablanca', '20250', 'Pro', '2024-01-14'],
      [2, 'Lucas Martin', 'lucas@lyon.fr', '8 Quai Rambaud', 'Lyon', '69002', 'Free', '2024-02-03'],
      [3, 'Sara El Idrissi', 'sara@rabat.ma', '4 Avenue Hassan II', 'Rabat', '10000', 'Team', '2024-02-21'],
      [4, 'Omar Haddad', null, '27 Rue de Fès', 'Tanger', '90000', 'Pro', '2024-03-09'],
      [5, 'Chloé Durand', 'chloe@nantes.fr', '3 Allée Flesselles', 'Nantes', '44000', 'Free', '2024-04-17'],
      [6, 'Youssef Amrani', 'youssef@agadir.ma', '15 Bd Mohammed V', 'Agadir', '80000', 'Team', '2024-05-02'],
    ],
  }],
}

const download = (text, name, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const baseName = (name = 'data') => name.replace(/\.[^.]+$/, '') || 'data'

// ------------------------------------------------------------------ empty state

const OpenFile = ({ onFile, onSample, error, reading }) => {
  const { t } = useTranslation()
  const input = useRef(null)
  return (
    <section className="cv-open">
      <div className="cv-open__grid" aria-hidden="true" />
      <div className="cv-open__body">
        <h1 className="cv-open__title">{t('converter.empty.title')}</h1>
        <p className="cv-open__text">{t('converter.empty.text')}</p>
        <div className="cv-open__actions">
          <button type="button" className="cv-btn cv-btn--primary" onClick={() => input.current?.click()} disabled={reading}>
            {t('converter.empty.choose')}
          </button>
          <button type="button" className="cv-btn" onClick={onSample} disabled={reading}>
            {t('converter.empty.sample')}
          </button>
        </div>
        <p className="cv-open__formats" dir="ltr">{EXCEL_EXTENSIONS.join('  ')}</p>
        {reading && <p className="cv-open__status" role="status">{t('converter.empty.reading', { name: reading })}</p>}
        {error && <p className="cv-open__error" role="alert">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept={EXCEL_EXTENSIONS.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = '' // choosing the same file again must work
          if (file) onFile(file)
        }}
      />
    </section>
  )
}

// ------------------------------------------------------------------ actions

export const Actions = ({ json, fileName, disabled }) => {
  const { t } = useTranslation()
  const { setBodyRequestData, setVisualData } = useAppState()
  const [copied, setCopied] = useState(false)

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

  return (
    <div className="cv-actions">
      <button type="button" className="cv-btn" onClick={copy} disabled={disabled} aria-live="polite">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? t('converter.actions.copied') : t('converter.actions.copy')}
      </button>
      <button type="button" className="cv-btn cv-btn--primary" disabled={disabled}
        onClick={() => download(JSON.stringify(json, null, 2), `${baseName(fileName)}.json`, 'application/json')}>
        <DownloadIcon />{t('converter.actions.downloadJson')}
      </button>
      <button type="button" className="cv-btn" disabled={disabled}
        onClick={() => downloadJsonAsExcel(json, `${baseName(fileName)}-json.xlsx`)}>
        <DownloadIcon />{t('converter.actions.downloadExcel')}
      </button>
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

// ------------------------------------------------------------------ page

const Converter = () => {
  const { t } = useTranslation()
  // kept across reloads and page changes (sessionStorage); a file too big for it stays in memory
  const [work, setWork] = useSessionState('converter', null)
  const [history, setHistory] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [view, setView] = useSessionState('converterView', 'json')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reading, setReading] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)

  const sheet = work?.sheets[work.active]
  const shape = work?.shapes[work.active]
  const emptyCells = work?.emptyCells ?? 'null'

  const json = useMemo(
    () => (sheet && shape ? buildJson(sheet.rows, shape, { emptyCells }) : []),
    [sheet, shape, emptyCells]
  )
  const fields = useMemo(() => (shape ? fieldsBySource(shape) : new Map()), [shape])
  const hasFields = shape ? includedCount(shape) > 0 : false

  const load = useCallback((fileName, sheets) => {
    const first = Math.max(0, sheets.findIndex((s) => s.rows.length > 0))
    setWork({
      fileName,
      sheets,
      active: first,
      shapes: Object.fromEntries(sheets.map((s, i) => [i, initialShape(s.columns)])),
      emptyCells: 'null',
    })
    setHistory([])
    setSelected(new Set())
    setError('')
    setNotice('')
  }, [setWork])

  const openFile = useCallback((file) => {
    if (!isSpreadsheetFile(file.name)) {
      setError(t('converter.errors.notSpreadsheet', { name: file.name }))
      return
    }
    setError('')
    setReading(file.name)
    file.arrayBuffer()
      .then((buffer) => {
        const sheets = readWorkbook(buffer)
        if (sheets.length === 0) throw new Error('no sheet')
        load(file.name, sheets)
      })
      .catch(() => setError(t('converter.errors.unreadable', { name: file.name })))
      .finally(() => setReading(''))
  }, [load, t])

  // ---- structure edits (each one can be undone)
  const commit = useCallback((next) => {
    setHistory((h) => [...h.slice(-49), { sheet: work.active, shape }])
    setWork((w) => ({ ...w, shapes: { ...w.shapes, [w.active]: next } }))
    setNotice('')
  }, [work?.active, shape, setWork])

  const errorText = (code) => t(`converter.errors.${code}`)

  const actions = {
    rename: (id, key) => {
      const r = renameNode(shape, id, key)
      if (r.error) return errorText(r.error)
      commit(r.nodes)
      return null
    },
    group: (ids, key) => {
      const r = groupNodes(shape, ids, key)
      if (r.error) return errorText(r.error)
      commit(r.nodes)
      return null
    },
    ungroup: (id) => {
      const r = ungroupNode(shape, id)
      if (r.error) setNotice(errorText(r.error))
      else commit(r.nodes)
    },
    moveOut: (id) => {
      const r = moveOut(shape, id)
      if (r.error) setNotice(errorText(r.error))
      else commit(r.nodes)
    },
    move: (id, step) => {
      const r = moveNode(shape, id, step)
      if (r.nodes !== shape) commit(r.nodes)
    },
    setInclude: (ids, include) => commit(setIncluded(shape, ids, include)),
    concat: (ids, options) => {
      const r = concatNodes(shape, ids, options)
      if (r.error) return errorText(r.error)
      commit(r.nodes)
      return null
    },
    updateConcat: (id, options) => {
      const r = updateConcat(shape, id, options)
      if (r.error) return errorText(r.error)
      commit(r.nodes)
      return null
    },
    split: (id) => {
      const r = splitConcat(shape, id)
      if (r.error) setNotice(errorText(r.error))
      else commit(r.nodes)
    },
  }

  const undo = useCallback(() => {
    const last = history[history.length - 1]
    if (!last) return
    setWork((w) => ({ ...w, active: last.sheet, shapes: { ...w.shapes, [last.sheet]: last.shape } }))
    setHistory(history.slice(0, -1))
    setSelected(new Set())
  }, [history, setWork])

  const reset = () => {
    if (!window.confirm(t('converter.file.resetConfirm'))) return
    commit(initialShape(sheet.columns))
    setSelected(new Set())
  }

  // Ctrl+Z / Cmd+Z, unless the focus is in a text field
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || e.shiftKey) return
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  const changeSheet = (i) => {
    setWork((w) => ({ ...w, active: i }))
    setSelected(new Set())
    setNotice('')
  }

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // ---- drop a file anywhere on the page
  const dropHandlers = {
    onDragEnter: (e) => {
      if (!e.dataTransfer.types.includes('Files')) return
      dragDepth.current++
      setDragging(true)
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    },
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      const files = e.dataTransfer.files
      if (files.length === 0) return
      if (files.length > 1) { setError(t('converter.errors.oneFile')); return }
      openFile(files[0])
    },
  }

  const fileInput = useRef(null)

  return (
    <div className={`cv${dragging ? ' is-dragging' : ''}`} {...dropHandlers}>
      {dragging && <div className="cv-dropveil" aria-hidden="true"><span>{t('converter.empty.dropHere')}</span></div>}

      {!work
        ? <OpenFile onFile={openFile} onSample={() => load(SAMPLE.fileName, SAMPLE.sheets)} error={error} reading={reading} />
        : <>
          <header className="cv-bar">
            <div className="cv-file">
              <span className="cv-file__icon"><FileIcon /></span>
              <div className="cv-file__text">
                <h1 className="cv-file__name" dir="auto">{work.fileName}</h1>
                <p className="cv-file__meta">
                  {t('converter.file.rows', { count: sheet.rows.length })}, {t('converter.file.columns', { count: sheet.columns.length })}
                </p>
              </div>
              <button type="button" className="cv-link" onClick={() => fileInput.current?.click()}>
                {t('converter.file.replace')}
              </button>
              <input ref={fileInput} type="file" hidden accept={EXCEL_EXTENSIONS.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) openFile(file)
                }} />
            </div>

            <div className="cv-bar__edit">
              <button type="button" className="cv-btn cv-btn--quiet" onClick={undo} disabled={history.length === 0} title={t('converter.file.undoTitle')}>
                <UndoIcon />{t('converter.file.undo')}
              </button>
              <button type="button" className="cv-btn cv-btn--quiet" onClick={reset} disabled={sheet.columns.length === 0}>
                {t('converter.file.reset')}
              </button>
            </div>

            <Actions json={json} fileName={work.fileName} disabled={!hasFields || json.length === 0} />
          </header>

          {(error || reading) && (
            <p className={error ? 'cv-banner cv-banner--error' : 'cv-banner'} role={error ? 'alert' : 'status'}>
              {error || t('converter.empty.reading', { name: reading })}
            </p>
          )}

          {sheet.columns.length === 0
            ? <>
              <p className="cv-banner">{t('converter.errors.emptySheet')}</p>
              <Sheet sheet={sheet} fields={fields} selected={selected} onToggle={toggle}
                sheets={work.sheets} active={work.active} onSheetChange={changeSheet} />
            </>
            : <div className="cv-work">
              <Sheet sheet={sheet} fields={fields} selected={selected} onToggle={toggle}
                sheets={work.sheets} active={work.active} onSheetChange={changeSheet} />

              <div className="cv-lower">
                <div className="cv-lower__keys">
                  {notice && <p className="cv-banner cv-banner--error" role="alert">{notice}</p>}
                  <KeysPanel shape={shape} selected={selected} setSelected={setSelected} actions={actions}
                    sample={(parts) => sheet.rows.slice(0, 3).map((row) => parts.map((p) => row[p.source]))}
                    sourceInfo={(node) => node.kind === 'field' && {
                      label: sheet.columns[node.source]?.letter,
                      title: t('converter.keys.column', { letter: sheet.columns[node.source]?.letter }),
                    }} />
                </div>
                <Preview
                  json={json}
                  emptyCells={emptyCells}
                  setEmptyCells={(v) => setWork((w) => ({ ...w, emptyCells: v }))}
                  view={view}
                  setView={setView}
                  hasFields={hasFields}
                />
              </div>
            </div>}
        </>}
    </div>
  )
}

export default Converter
