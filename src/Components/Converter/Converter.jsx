"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Sheet from './Sheet'
import KeysPanel from './KeysPanel'
import Preview from './Preview'
import Actions from './Actions'
import MappingsMenu from './MappingsMenu'
import { FileIcon, UndoIcon } from './icons'
import Mascot from '../Mascot'
import LiveScene from '../LiveScene'
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
  sheetView,
  setFieldType,
  typeIssues,
  mappingData,
  applyMapping,
  matchHeaderRow,
  mappingColumns,
} from '../../utils/converter'
import { wrapOutput } from '../../utils/output'
import { useSessionState } from '../../utils/useSessionState'
import './converter.css'

const DEFAULT_OUTPUT = { root: 'array', rootKey: 'data' }

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

// ------------------------------------------------------------------ empty state

const OpenFile = ({ onFile, onSample, error, reading }) => {
  const { t } = useTranslation()
  const input = useRef(null)
  return (
    <section className="cv-open">
      <LiveScene count={12} seed={2} />
      <div className="cv-open__grid" aria-hidden="true" />
      <div className="cv-open__body">
        <Mascot pose="empty" motion="peek" className="cv-open__mascot cv-open__mascot--wide" />
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

export { Actions }

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
  const [applied, setApplied] = useState(null) // report of the last saved structure applied
  const dragDepth = useRef(0)

  const stored = work?.sheets[work.active]
  const sheet = useMemo(() => (stored ? sheetView(stored) : null), [stored])
  const shape = work?.shapes[work.active]
  const emptyCells = work?.emptyCells ?? 'null'
  const output = work?.output ?? DEFAULT_OUTPUT

  const json = useMemo(
    () => (sheet && shape ? buildJson(sheet.rows, shape, { emptyCells }) : []),
    [sheet, shape, emptyCells]
  )
  const delivered = useMemo(() => wrapOutput(json, output), [json, output])
  const issues = useMemo(
    () => (sheet && shape ? typeIssues((field) => sheet.rows.map((r) => r[field.source]), shape) : new Map()),
    [sheet, shape]
  )
  const fields = useMemo(() => (shape ? fieldsBySource(shape) : new Map()), [shape])
  const hasFields = shape ? includedCount(shape) > 0 : false

  const load = useCallback((fileName, sheets) => {
    const views = sheets.map(sheetView)
    const first = Math.max(0, views.findIndex((v) => v.rowCount > 0))
    setWork({
      fileName,
      sheets,
      active: first,
      shapes: Object.fromEntries(views.map((v, i) => [i, initialShape(v.columns)])),
      emptyCells: 'null',
      output: DEFAULT_OUTPUT,
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
    setHistory((h) => [...h.slice(-49), { sheet: work.active, shape, headerRow: sheet.headerRow }])
    setWork((w) => ({ ...w, shapes: { ...w.shapes, [w.active]: next } }))
    setNotice('')
  }, [work?.active, shape, sheet?.headerRow, setWork])

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
    setType: (id, type) => {
      const r = setFieldType(shape, id, type)
      if (!r.error) commit(r.nodes)
    },
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
    setWork((w) => ({
      ...w,
      active: last.sheet,
      shapes: { ...w.shapes, [last.sheet]: last.shape },
      sheets: w.sheets.map((sh, i) => (i === last.sheet && sh.matrix ? { ...sh, headerRow: last.headerRow } : sh)),
    }))
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

  // the headers are in another row: the columns change, so the keys start again from them
  const changeHeaderRow = (row) => {
    const columns = sheetView({ ...stored, headerRow: row }).columns
    setHistory((h) => [...h.slice(-49), { sheet: work.active, shape, headerRow: sheet.headerRow }])
    setWork((w) => ({
      ...w,
      sheets: w.sheets.map((sh, i) => (i === w.active ? { ...sh, headerRow: row } : sh)),
      shapes: { ...w.shapes, [w.active]: initialShape(columns) },
    }))
    setSelected(new Set())
  }

  const applySaved = (data, name) => {
    // the file may have its headers in another row than the one shown: use the row that matches best
    const row = matchHeaderRow(stored, mappingColumns(data))
    const target = row !== null && row !== sheet.headerRow ? sheetView({ ...stored, headerRow: row }) : sheet
    const { nodes, missing, added } = applyMapping(data, target.columns)
    commit(nodes)
    setWork((w) => ({
      ...w,
      sheets: w.sheets.map((sh, i) => (i === w.active && sh.matrix ? { ...sh, headerRow: target.headerRow } : sh)),
      emptyCells: data.options?.emptyCells ?? w.emptyCells,
      output: data.options?.output ?? w.output,
    }))
    setSelected(new Set())
    setApplied({ name, missing, added })
  }

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
                  {t('converter.file.rows', { count: sheet.rowCount })}, {t('converter.file.columns', { count: sheet.columns.length })}
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
              <MappingsMenu
                kind="sheet"
                defaultName={work.fileName.replace(/\.[^.]+$/, '')}
                disabled={sheet.columns.length === 0}
                getData={() => mappingData(shape, sheet.columns, { emptyCells, output })}
                onApply={applySaved}
              />
            </div>

            <Actions json={delivered} items={json} fileName={work.fileName} disabled={!hasFields || json.length === 0} />
          </header>

          {applied && (
            <div className="cv-banner cv-banner--ok" role="status">
              <span>
                {t('mappings.applied', { name: applied.name })}
                {applied.missing.length > 0 && <> {t('mappings.missing', { count: applied.missing.length, names: applied.missing.join(', ') })}</>}
                {applied.added.length > 0 && <> {t('mappings.added', { count: applied.added.length, names: applied.added.join(', ') })}</>}
              </span>
              <button type="button" className="cv-link" onClick={() => setApplied(null)}>{t('mappings.dismiss')}</button>
            </div>
          )}

          {(error || reading) && (
            <p className={error ? 'cv-banner cv-banner--error' : 'cv-banner'} role={error ? 'alert' : 'status'}>
              {error || t('converter.empty.reading', { name: reading })}
            </p>
          )}

          {sheet.columns.length === 0
            ? <>
              <p className="cv-banner">{t('converter.errors.emptySheet')}</p>
              <Sheet sheet={sheet} fields={fields} selected={selected} onToggle={toggle}
                sheets={work.sheets} active={work.active} onSheetChange={changeSheet}
                headerRows={stored.matrix?.length ?? 0} onHeaderRowChange={changeHeaderRow} />
            </>
            : <div className="cv-work">
              <Sheet sheet={sheet} fields={fields} selected={selected} onToggle={toggle}
                sheets={work.sheets} active={work.active} onSheetChange={changeSheet}
                headerRows={stored.matrix?.length ?? 0} onHeaderRowChange={changeHeaderRow} />

              <div className="cv-lower">
                <div className="cv-lower__keys">
                  {notice && <p className="cv-banner cv-banner--error" role="alert">{notice}</p>}
                  <KeysPanel shape={shape} selected={selected} setSelected={setSelected} actions={actions} issues={issues}
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
                  output={output}
                  setOutput={(o) => setWork((w) => ({ ...w, output: o }))}
                  delivered={delivered}
                  tableName={sheet.name}
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
