"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import KeysPanel from '../Converter/KeysPanel'
import { Actions } from '../Converter/Converter'
import JsonGraph from '../Flow/JsonGraph'
import { highlightJson } from '../JsonCode'
import { UndoIcon } from '../Converter/icons'
import {
  groupNodes,
  includedCount,
  concatNodes,
  moveNode,
  moveOut,
  splitConcat,
  updateConcat,
  renameNode,
  setIncluded,
  ungroupNode,
} from '../../utils/converter'
import { getPath, inferShape, normalizeInput, originOf, presence, reshape } from '../../utils/reshape'
import { parseJsonBody } from '../../utils/http'
import { useSessionState } from '../../utils/useSessionState'
import '../Converter/converter.css'
import './reshape.css'

const PREVIEW_ITEMS = 20
const GRAPH_ITEMS = 200

const SAMPLE = [
  { id: 'ord-1001', placed: '2024-03-02', customer: { name: 'Amina Benali', email: 'amina@atlas.ma', address: { city: 'Casablanca', zip: '20250' } }, total: 129.9, paid: true },
  { id: 'ord-1002', placed: '2024-03-04', customer: { name: 'Lucas Martin', email: 'lucas@lyon.fr', address: { city: 'Lyon', zip: '69002' } }, total: 54, paid: false, note: 'Leave at the door' },
  { id: 'ord-1003', placed: '2024-03-05', customer: { name: 'Sara El Idrissi', email: 'sara@rabat.ma', address: { city: 'Rabat', zip: '10000' } }, total: 310.5, paid: true },
]

const dotted = (path) => path.join('.')

// ------------------------------------------------------------------ empty state

const OpenJson = ({ onText, onSample, error, setError }) => {
  const { t } = useTranslation()
  const id = useId()
  const input = useRef(null)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')

  const usePasted = (e) => {
    e.preventDefault()
    onText(text, t('reshape.pasted'))
  }

  return (
    <section className="cv-open rs-open">
      <div className="cv-open__grid rs-open__grid" aria-hidden="true" />
      <div className="cv-open__body">
        <h1 className="cv-open__title">{t('reshape.empty.title')}</h1>
        <p className="cv-open__text">{t('reshape.empty.text')}</p>

        {!pasting
          ? <div className="cv-open__actions">
            <button type="button" className="cv-btn cv-btn--primary" onClick={() => input.current?.click()}>{t('reshape.empty.choose')}</button>
            <button type="button" className="cv-btn" onClick={() => { setPasting(true); setError('') }}>{t('reshape.empty.paste')}</button>
            <button type="button" className="cv-btn cv-btn--quiet" onClick={onSample}>{t('converter.empty.sample')}</button>
          </div>
          : <form className="rs-paste" onSubmit={usePasted}>
            <label htmlFor={`${id}-json`} className="visually-hidden">{t('reshape.empty.paste')}</label>
            <textarea
              id={`${id}-json`}
              className="rs-paste__area"
              value={text}
              dir="ltr"
              spellCheck="false"
              autoFocus
              placeholder={'[\n  { "id": 1, "name": "Amina" }\n]'}
              aria-invalid={error ? true : undefined}
              onChange={(e) => { setText(e.target.value); setError('') }}
            />
            <div className="rs-paste__actions">
              <button type="button" className="cv-btn cv-btn--quiet" onClick={() => { setPasting(false); setError('') }}>{t('apiTester.cancel')}</button>
              <button type="submit" className="cv-btn cv-btn--primary" disabled={!text.trim()}>{t('reshape.empty.usePasted')}</button>
            </div>
          </form>}

        {error && <p className="cv-open__error" role="alert">{error}</p>}
      </div>
      <input ref={input} type="file" hidden accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) file.text().then((txt) => onText(txt, file.name))
        }} />
    </section>
  )
}

// ------------------------------------------------------------------ preview

const Code = ({ value, total }) => {
  const { t } = useTranslation()
  const text = useMemo(() => JSON.stringify(value, null, 2), [value])
  return (
    <>
      {total > PREVIEW_ITEMS && <p className="cv-note">{t('converter.preview.firstItems', { shown: PREVIEW_ITEMS, total: total.toLocaleString() })}</p>}
      <pre className="cv-code rs-code" dir="ltr" tabIndex={0}><code>{highlightJson(text)}</code></pre>
    </>
  )
}

const VIEWS = ['result', 'original', 'graph']

const Preview = ({ result, original, single, missing, setMissing, view, setView }) => {
  const { t } = useTranslation()
  const id = useId()
  const sample = (list) => (single ? list[0] : list.slice(0, PREVIEW_ITEMS))
  const graphData = useMemo(() => (single ? result[0] : result.slice(0, GRAPH_ITEMS)), [result, single])

  const onKey = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = VIEWS[(VIEWS.indexOf(view) + step + VIEWS.length) % VIEWS.length]
    setView(next)
    document.getElementById(`${id}-${next}`)?.focus()
  }

  return (
    <section className="cv-panel cv-preview rs-preview" aria-label={t('converter.preview.title')}>
      <header className="cv-panel__head cv-preview__head">
        <div className="cv-views" role="tablist" aria-label={t('converter.preview.title')} onKeyDown={onKey}>
          {VIEWS.map((v) => (
            <button key={v} id={`${id}-${v}`} type="button" role="tab" className="cv-views__tab"
              aria-selected={view === v} tabIndex={view === v ? 0 : -1} onClick={() => setView(v)}>
              {t(`reshape.views.${v}`)}
            </button>
          ))}
        </div>
        <label className="cv-select-label">
          <span>{t('reshape.missing.label')}</span>
          <select className="cv-select" value={missing} onChange={(e) => setMissing(e.target.value)}>
            <option value="omit">{t('reshape.missing.omit')}</option>
            <option value="null">{t('reshape.missing.null')}</option>
          </select>
        </label>
      </header>
      <div className="cv-preview__body" role="tabpanel" aria-labelledby={`${id}-${view}`}>
        {view === 'result' && <Code value={sample(result)} total={single ? 1 : result.length} />}
        {view === 'original' && <Code value={sample(original)} total={single ? 1 : original.length} />}
        {view === 'graph' && (
          <>
            {!single && result.length > GRAPH_ITEMS && <p className="cv-note">{t('converter.preview.sample', { count: GRAPH_ITEMS })}</p>}
            <div className="cv-canvas"><JsonGraph data={graphData} /></div>
          </>
        )}
      </div>
    </section>
  )
}

// ------------------------------------------------------------------ page

const Reshape = () => {
  const { t } = useTranslation()
  const [work, setWork] = useSessionState('reshape', null)
  const [view, setView] = useSessionState('reshapeView', 'result')
  const [history, setHistory] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileInput = useRef(null)

  const load = useCallback((text, fileName) => {
    const parsed = parseJsonBody(text)
    if (!parsed.ok || parsed.value === undefined) {
      setError(parsed.line
        ? t('reshape.errors.invalidJsonAt', { line: parsed.line, column: parsed.column })
        : t('reshape.errors.invalidJson'))
      return
    }
    const input = normalizeInput(parsed.value)
    if (input.error) { setError(t(`reshape.errors.${input.error}`)); return }
    const shape = inferShape(input.items)
    setWork({ fileName, items: input.items, single: input.single, shape, initial: shape, missing: 'omit' })
    setHistory([])
    setSelected(new Set())
    setError('')
    setNotice('')
  }, [setWork, t])

  const openFile = useCallback((file) => {
    if (!/\.json$/i.test(file.name)) {
      setError(t('reshape.errors.notJsonFile', { name: file.name }))
      return
    }
    file.text().then((text) => load(text, file.name)).catch(() => setError(t('converter.errors.unreadable', { name: file.name })))
  }, [load, t])

  const shape = work?.shape
  const result = useMemo(() => (work ? reshape(work.items, work.shape, { missing: work.missing }) : []), [work])
  const counts = useMemo(() => (work ? presence(work.items, work.shape) : new Map()), [work?.items, work?.shape]) // eslint-disable-line react-hooks/exhaustive-deps
  const output = work?.single ? result[0] : result
  const hasFields = shape ? includedCount(shape) > 0 : false

  // ---- edits
  const commit = useCallback((next) => {
    setHistory((h) => [...h.slice(-49), shape])
    setWork((w) => ({ ...w, shape: next }))
    setNotice('')
  }, [shape, setWork])

  const errorText = (code) => t(`converter.errors.${code}`)
  const actions = {
    rename: (nodeId, key) => {
      const r = renameNode(shape, nodeId, key)
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
    ungroup: (nodeId) => {
      const r = ungroupNode(shape, nodeId)
      if (r.error) setNotice(errorText(r.error))
      else commit(r.nodes)
    },
    moveOut: (nodeId) => {
      const r = moveOut(shape, nodeId)
      if (r.error) setNotice(errorText(r.error))
      else commit(r.nodes)
    },
    move: (nodeId, step) => {
      const r = moveNode(shape, nodeId, step)
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
    setWork((w) => ({ ...w, shape: last }))
    setHistory(history.slice(0, -1))
    setSelected(new Set())
  }, [history, setWork])

  const reset = () => {
    if (!window.confirm(t('reshape.resetConfirm'))) return
    commit(work.initial)
    setSelected(new Set())
  }

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

  // where each key comes from: shown when it moved or was renamed, or when some items lack it
  const sourceInfo = useCallback((node, path) => {
    const total = work.items.length
    if (node.kind === 'group') {
      if (!node.origin) return { label: t('reshape.source.newGroup'), title: t('reshape.source.newGroupTitle'), changed: true }
      const from = dotted(node.origin)
      return from !== dotted(path) ? { label: t('reshape.source.from', { path: from }), title: from, changed: true } : null
    }
    if (node.kind === 'concat') return null
    const from = dotted(originOf(node))
    if (from !== dotted(path)) return { label: t('reshape.source.from', { path: from }), title: from, changed: true }
    const n = counts.get(node.id) ?? total
    if (n < total) return { label: t('reshape.source.inSome', { count: n, total }), title: t('reshape.source.inSomeTitle', { count: n, total }) }
    return null
  }, [work, counts, t])

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

  const keyCount = shape ? includedCount(shape) : 0

  return (
    <div className={`cv rs${dragging ? ' is-dragging' : ''}`} {...dropHandlers}>
      {dragging && <div className="cv-dropveil" aria-hidden="true"><span>{t('converter.empty.dropHere')}</span></div>}

      {!work
        ? <OpenJson onText={load} onSample={() => load(JSON.stringify(SAMPLE), 'orders-sample.json')} error={error} setError={setError} />
        : <>
          <header className="cv-bar">
            <div className="cv-file">
              <span className="cv-file__icon rs-file__icon" aria-hidden="true">{'{ }'}</span>
              <div className="cv-file__text">
                <h1 className="cv-file__name" dir="auto">{work.fileName}</h1>
                <p className="cv-file__meta">
                  {work.single ? t('reshape.oneObject') : t('reshape.objects', { count: work.items.length })}, {t('reshape.keys', { count: keyCount })}
                </p>
              </div>
              <button type="button" className="cv-link" onClick={() => fileInput.current?.click()}>{t('converter.file.replace')}</button>
              <input ref={fileInput} type="file" hidden accept=".json,application/json"
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
              <button type="button" className="cv-btn cv-btn--quiet" onClick={reset} disabled={history.length === 0 && work.shape === work.initial}>
                {t('converter.file.reset')}
              </button>
              <button type="button" className="cv-btn cv-btn--quiet" onClick={() => { setWork(null); setError('') }}>
                {t('reshape.close')}
              </button>
            </div>
            <Actions json={output} fileName={work.fileName} disabled={!hasFields} />
          </header>

          {error && <p className="cv-banner cv-banner--error" role="alert">{error}</p>}

          <div className="rs-grid">
            <div className="rs-grid__keys">
              {notice && <p className="cv-banner cv-banner--error" role="alert">{notice}</p>}
              <KeysPanel
                shape={shape}
                selected={selected}
                setSelected={setSelected}
                actions={actions}
                sourceInfo={sourceInfo}
                title={t('reshape.keysTitle')}
                help={t('reshape.keysHelp')}
                sample={(parts) => work.items.slice(0, 3).map((item) => parts.map((p) => getPath(item, p.source)))}
              />
            </div>
            <Preview
              result={result}
              original={work.items}
              single={work.single}
              missing={work.missing}
              setMissing={(missing) => setWork((w) => ({ ...w, missing }))}
              view={view}
              setView={setView}
            />
          </div>
        </>}
    </div>
  )
}

export default Reshape
