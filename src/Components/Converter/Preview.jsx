"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import JsonGraph from '../Flow/JsonGraph'
import SchemaDiagram from '../Flow/SchemaDiagram'
import { applySchemaOverrides, inferSchema } from '../../utils/schemaInference'
import { highlightJson } from '../JsonCode'
import { wrapOutput } from '../../utils/output'
import { useSessionState } from '../../utils/useSessionState'
import DbLoad from '../DbLoad/DbLoad'

const VIEWS = ['json', 'graph', 'tables']
const JSON_ITEMS = 20
// the graph and the tables are built from a sample: enough to show the shape, light enough to stay fluid
const GRAPH_ITEMS = 200
const TABLE_ITEMS = 500

const NO_OVERRIDES = { tableNames: {}, columnTypes: {} }

const Diagram = ({ data, total }) => {
  const { t } = useTranslation()
  const [overrides, setOverrides] = useState(NO_OVERRIDES)
  const base = useMemo(() => inferSchema(data, { rootName: 'rows' }), [data])
  useEffect(() => { setOverrides(NO_OVERRIDES) }, [base])
  const schema = useMemo(() => applySchemaOverrides(base, overrides), [base, overrides])

  const renameTable = useCallback((tableId, name) => {
    if (schema.tables.some((tb) => tb.id !== tableId && tb.name === name)) return false
    setOverrides((prev) => ({ ...prev, tableNames: { ...prev.tableNames, [tableId]: name } }))
    return true
  }, [schema])
  const setColumnType = useCallback((tableId, column, type) => {
    setOverrides((prev) => ({ ...prev, columnTypes: { ...prev.columnTypes, [`${tableId}::${column}`]: type } }))
  }, [])

  return (
    <>
      {total > data.length && <p className="cv-note">{t('converter.preview.sample', { count: data.length })}</p>}
      <div className="cv-canvas">
        <SchemaDiagram schema={schema} onRenameTable={renameTable} onColumnTypeChange={setColumnType} />
      </div>
    </>
  )
}

/** Tables: the diagram of the tables found in the data, or loading the data into a database. */
export const Tables = ({ data, all, total, rootName, stateKey }) => {
  const { t } = useTranslation()
  const [mode, setMode] = useSessionState(`${stateKey}:mode`, 'load')
  return (
    <>
      <div className="db-modes" role="radiogroup" aria-label={t('dbLoad.modes.label')}>
        {['load', 'diagram'].map((m) => (
          <label key={m} className={mode === m ? 'is-on' : undefined}>
            <input type="radio" name={`${stateKey}-mode`} checked={mode === m} onChange={() => setMode(m)} />
            {t(`dbLoad.modes.${m}`)}
          </label>
        ))}
      </div>
      {mode === 'diagram'
        ? <Diagram data={data} total={total} />
        : <DbLoad items={all} rootName={rootName} stateKey={stateKey} />}
    </>
  )
}

const Preview = ({ json, emptyCells, setEmptyCells, view, setView, hasFields, output = { root: 'array' }, setOutput, tableName = 'data' }) => {
  const { t } = useTranslation()
  const id = useId()
  const text = useMemo(() => JSON.stringify(wrapOutput(json.slice(0, JSON_ITEMS), output), null, 2), [json, output])
  const graphData = useMemo(() => json.slice(0, GRAPH_ITEMS), [json])
  const tableData = useMemo(() => json.slice(0, TABLE_ITEMS), [json])

  const onTabKey = (e) => {
    const i = VIEWS.indexOf(view)
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = VIEWS[(i + step + VIEWS.length) % VIEWS.length]
    setView(next)
    document.getElementById(`${id}-${next}`)?.focus()
  }

  return (
    <section className="cv-panel cv-preview" aria-label={t('converter.preview.title')}>
      <header className="cv-panel__head cv-preview__head">
        <div className="cv-views" role="tablist" aria-label={t('converter.preview.title')} onKeyDown={onTabKey}>
          {VIEWS.map((v) => (
            <button
              key={v}
              id={`${id}-${v}`}
              type="button"
              role="tab"
              aria-selected={view === v}
              aria-controls={`${id}-panel`}
              tabIndex={view === v ? 0 : -1}
              className="cv-views__tab"
              onClick={() => setView(v)}
            >
              {t(`converter.preview.tabs.${v}`)}
            </button>
          ))}
        </div>
        <label className="cv-select-label">
          <span>{t('converter.preview.emptyCells')}</span>
          <select className="cv-select" value={emptyCells} onChange={(e) => setEmptyCells(e.target.value)}>
            <option value="null">{t('converter.preview.emptyNull')}</option>
            <option value="omit">{t('converter.preview.emptyOmit')}</option>
            <option value="empty">{t('converter.preview.emptyEmpty')}</option>
          </select>
        </label>
        {setOutput && (
          <div className="cv-select-label cv-root">
            <label htmlFor={`${id}-root`}>{t('converter.preview.root')}</label>
            <select id={`${id}-root`} className="cv-select" value={output.root}
              onChange={(e) => setOutput({ ...output, root: e.target.value })}>
              <option value="array">{t('converter.preview.rootArray')}</option>
              <option value="object">{t('converter.preview.rootObject')}</option>
            </select>
            {output.root === 'object' && (
              <input className="cv-input cv-input--key cv-root__key" value={output.rootKey ?? ''} dir="ltr" spellCheck="false"
                aria-label={t('converter.preview.rootKey')} placeholder="data"
                onChange={(e) => setOutput({ ...output, rootKey: e.target.value })} />
            )}
          </div>
        )}
      </header>

      <div className="cv-preview__body" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${view}`}>
        {!hasFields
          ? <p className="cv-empty-note">{t('converter.preview.nothing')}</p>
          : view === 'json'
            ? <>
              {json.length > JSON_ITEMS && (
                <p className="cv-note">{t('converter.preview.firstItems', { shown: JSON_ITEMS, total: json.length.toLocaleString() })}</p>
              )}
              <pre className="cv-code" dir="ltr" tabIndex={0}><code>{highlightJson(text)}</code></pre>
            </>
            : view === 'graph'
              ? <>
                {json.length > GRAPH_ITEMS && <p className="cv-note">{t('converter.preview.sample', { count: GRAPH_ITEMS })}</p>}
                <div className="cv-canvas"><JsonGraph data={graphData} /></div>
              </>
              : <Tables data={tableData} all={json} total={json.length} rootName={tableName} stateKey="dbLoad:converter" />}
      </div>
    </section>
  )
}

export default Preview
