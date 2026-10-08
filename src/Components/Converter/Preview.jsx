"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import JsonGraph from '../Flow/JsonGraph'
import SchemaDiagram from '../Flow/SchemaDiagram'
import { applySchemaOverrides, inferSchema } from '../../utils/schemaInference'
import { highlightJson } from '../JsonCode'

const VIEWS = ['json', 'graph', 'tables']
const JSON_ITEMS = 20
// the graph and the tables are built from a sample: enough to show the shape, light enough to stay fluid
const GRAPH_ITEMS = 200
const TABLE_ITEMS = 500

const NO_OVERRIDES = { tableNames: {}, columnTypes: {} }

const Tables = ({ data, total }) => {
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

const Preview = ({ json, emptyCells, setEmptyCells, view, setView, hasFields }) => {
  const { t } = useTranslation()
  const id = useId()
  const text = useMemo(() => JSON.stringify(json.slice(0, JSON_ITEMS), null, 2), [json])
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
              : <Tables data={tableData} total={json.length} />}
      </div>
    </section>
  )
}

export default Preview
