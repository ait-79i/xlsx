"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSessionState } from '../../utils/useSessionState'
import {
  COLUMN_TYPES,
  autoMapping,
  buildTables,
  fieldPaths,
  listPaths,
  mappingFromSchema,
  newColumn,
  newTable,
} from '../../utils/dbMapping'
import { MODES, TARGETS, generate } from '../../utils/dbTargets'
import { parseSqlSchema } from '../../utils/sqlParser'
import { download } from '../Converter/Actions'
import { highlightJson } from '../JsonCode'
import { CheckIcon, CloseIcon, CopyIcon, DownIcon, DownloadIcon, UpIcon } from '../Converter/icons'
import './dbload.css'

const GROUPS = [
  ['sql', ['postgres', 'mysql', 'mariadb', 'sqlite', 'sqlserver', 'oracle']],
  ['nosql', ['mongodb', 'cassandra', 'elasticsearch']],
]
const PREVIEW_LINES = 160
const DEFAULT_OPTIONS = { createTables: true, mode: 'insert', transaction: true, batchSize: 500, namespace: '' }

const isDocumentTarget = (target) => ['mongo', 'es'].includes(TARGETS[target].family)

// a source as the value of a <select>
const encode = (s) => `${s.kind}|${s.path ?? ''}`
const decode = (v, previous) => {
  const [kind, ...rest] = v.split('|')
  const path = rest.join('|')
  if (kind === 'const') return { kind, value: previous?.kind === 'const' ? previous.value : '' }
  return ['field', 'parent', 'root'].includes(kind) ? { kind, path } : { kind }
}

/** The list path whose elements hold the rows of `rowsFrom` (the parent rows), "" for the top items. */
const parentListOf = (rowsFrom, lists) => {
  const prefixes = lists.filter((p) => rowsFrom.startsWith(`${p}.`))
  return prefixes.sort((a, b) => b.length - a.length)[0] ?? ''
}

const useCopy = () => {
  const [copied, setCopied] = useState(null)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  return [copied, (what, text) => navigator.clipboard?.writeText(text).then(() => setCopied(what)).catch(() => {})]
}

// ------------------------------------------------------------------ your own tables

const ImportTables = ({ items, onImport, onClose }) => {
  const { t } = useTranslation()
  const id = useId()
  const dialog = useRef(null)
  const file = useRef(null)
  const [sql, setSql] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const el = dialog.current
    if (el && !el.open) el.showModal()
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const { schema, errors } = parseSqlSchema(sql)
    if (schema.tables.length === 0) {
      setError(t(`schema.parseErrors.${errors[0]?.code ?? 'noCreateTable'}`, errors[0]?.params ?? {}))
      return
    }
    onImport(mappingFromSchema(schema, items))
  }

  return (
    <dialog ref={dialog} className="cv-dialog" aria-labelledby={`${id}-title`} onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose() }}>
      <form className="cv-dialog__body" onSubmit={submit}>
        <header className="cv-dialog__head">
          <h2 id={`${id}-title`} className="cv-dialog__title">{t('dbLoad.import.title')}</h2>
          <button type="button" className="cv-icon-btn" aria-label={t('apiTester.cancel')} onClick={onClose}><CloseIcon /></button>
        </header>
        <p className="cv-dialog__hint">{t('dbLoad.import.text')}</p>
        <label className="visually-hidden" htmlFor={`${id}-sql`}>{t('dbLoad.import.title')}</label>
        <textarea id={`${id}-sql`} className="cv-input db-import__sql" value={sql} dir="ltr" spellCheck="false" autoFocus
          placeholder={'CREATE TABLE orders (\n  order_id INT PRIMARY KEY,\n  placed DATE,\n  customer_name VARCHAR(100)\n);'}
          onChange={(e) => { setSql(e.target.value); setError('') }} />
        {error && <p className="cv-field-error" role="alert">{error}</p>}
        <footer className="cv-dialog__foot db-import__foot">
          <button type="button" className="cv-btn cv-btn--quiet" onClick={() => file.current?.click()}>{t('dbLoad.import.openFile')}</button>
          <span className="db-spacer" />
          <button type="button" className="cv-btn" onClick={onClose}>{t('apiTester.cancel')}</button>
          <button type="submit" className="cv-btn cv-btn--primary" disabled={!sql.trim()}>{t('dbLoad.import.submit')}</button>
        </footer>
        <input ref={file} type="file" hidden accept=".sql,text/plain"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) f.text().then((text) => { setSql(text); setError('') })
          }} />
      </form>
    </dialog>
  )
}

// ------------------------------------------------------------------ table editor

const SourceSelect = ({ column, sources, onChange, label }) => {
  const { t } = useTranslation()
  const value = encode(column.source)
  const known = sources.some((g) => g.options.some((o) => o.value === value))
  return (
    <span className="db-source">
      <select className={`cv-select db-source__select${column.source.kind === 'none' ? ' is-empty' : ''}`} value={value}
        aria-label={label} onChange={(e) => onChange(decode(e.target.value, column.source))}>
        {!known && <option value={value}>{column.source.path || column.source.kind}</option>}
        {sources.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
      </select>
      {column.source.kind === 'const' && (
        <input className="cv-input db-source__const" value={column.source.value ?? ''} placeholder={t('dbLoad.source.constPlaceholder')}
          aria-label={t('dbLoad.source.constLabel', { column: column.name })}
          onChange={(e) => onChange({ kind: 'const', value: e.target.value })} />
      )}
    </span>
  )
}

const TableEditor = ({ table, items, lists, built, onChange, onRemove }) => {
  const { t } = useTranslation()
  const id = useId()
  const parentList = parentListOf(table.rowsFrom, lists)

  const sources = useMemo(() => {
    const own = fieldPaths(items, table.rowsFrom)
    const groups = [{
      label: t('dbLoad.source.inRow'),
      options: own.map((f) => ({ value: `field|${f.path}`, label: f.path === '' ? t('dbLoad.source.itself') : f.path })),
    }]
    if (table.rowsFrom) {
      groups.push({
        label: t('dbLoad.source.inParent'),
        options: fieldPaths(items, parentList).filter((f) => f.path).map((f) => ({ value: `parent|${f.path}`, label: f.path })),
      })
    }
    groups.push({
      label: t('dbLoad.source.generated'),
      options: [
        { value: 'row|', label: t('dbLoad.source.row') },
        ...(table.rowsFrom ? [{ value: 'parentRow|', label: t('dbLoad.source.parentRow') }, { value: 'index|', label: t('dbLoad.source.index') }] : []),
        { value: 'const|', label: t('dbLoad.source.const') },
        { value: 'none|', label: t('dbLoad.source.none') },
      ],
    })
    return groups
  }, [items, table.rowsFrom, parentList, t])

  const setColumn = (colId, patch) => onChange({ ...table, columns: table.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)) })
  const move = (index, step) => {
    const cols = [...table.columns]
    const target = index + step
    if (target < 0 || target >= cols.length) return
    ;[cols[index], cols[target]] = [cols[target], cols[index]]
    onChange({ ...table, columns: cols })
  }
  const previewRows = built?.rows.slice(0, 3) ?? []

  return (
    <div className="db-editor">
      <div className="db-editor__head">
        <label className="db-editor__name">
          <span>{t('dbLoad.table.name')}</span>
          <input className="cv-input cv-input--key" value={table.name} dir="ltr" spellCheck="false"
            onChange={(e) => onChange({ ...table, name: e.target.value })} />
        </label>
        <label className="db-editor__rows">
          <span>{t('dbLoad.table.rowsFrom')}</span>
          <select className="cv-select" value={table.rowsFrom} onChange={(e) => onChange({ ...table, rowsFrom: e.target.value })}>
            <option value="">{t('dbLoad.table.eachItem')}</option>
            {lists.map((p) => <option key={p} value={p}>{t('dbLoad.table.eachOf', { list: p })}</option>)}
          </select>
        </label>
        <button type="button" className="cv-btn cv-btn--quiet cv-btn--small db-editor__remove" onClick={onRemove}>{t('dbLoad.table.remove')}</button>
      </div>

      <table className="db-cols">
        <thead>
          <tr>
            <th scope="col" className="db-cols__key" title={t('dbLoad.column.keyTitle')}>{t('dbLoad.column.key')}</th>
            <th scope="col">{t('dbLoad.column.name')}</th>
            <th scope="col">{t('dbLoad.column.type')}</th>
            <th scope="col">{t('dbLoad.column.source')}</th>
            <th scope="col"><span className="visually-hidden">{t('dbLoad.column.tools')}</span></th>
          </tr>
        </thead>
        <tbody>
          {table.columns.map((col, i) => {
            const issue = built?.issues.get(col.name)
            return (
              <tr key={col.id} className={issue ? 'has-issue' : undefined}>
                <td className="db-cols__key">
                  <input type="checkbox" className="cv-check" checked={col.key} aria-label={t('dbLoad.column.keyOf', { column: col.name })}
                    onChange={(e) => setColumn(col.id, { key: e.target.checked })} />
                </td>
                <td>
                  <input className="cv-input cv-input--key db-cols__name" value={col.name} dir="ltr" spellCheck="false"
                    aria-label={t('dbLoad.column.name')} onChange={(e) => setColumn(col.id, { name: e.target.value })} />
                  {issue && <span className="db-cols__issue">{t('dbLoad.column.issue', { count: issue })}</span>}
                </td>
                <td>
                  <select className="cv-select db-cols__type" value={col.type} aria-label={t('dbLoad.column.typeOf', { column: col.name })}
                    onChange={(e) => setColumn(col.id, { type: e.target.value })}>
                    {COLUMN_TYPES.map((type) => <option key={type} value={type}>{t(`dbLoad.types.${type}`)}</option>)}
                  </select>
                </td>
                <td>
                  <SourceSelect column={col} sources={sources} label={t('dbLoad.column.sourceOf', { column: col.name })}
                    onChange={(source) => setColumn(col.id, { source })} />
                </td>
                <td className="db-cols__tools">
                  <button type="button" className="cv-icon-btn" disabled={i === 0} aria-label={t('converter.keys.moveUp')} onClick={() => move(i, -1)}><UpIcon /></button>
                  <button type="button" className="cv-icon-btn" disabled={i === table.columns.length - 1} aria-label={t('converter.keys.moveDown')} onClick={() => move(i, 1)}><DownIcon /></button>
                  <button type="button" className="cv-icon-btn" aria-label={t('dbLoad.column.remove', { column: col.name })}
                    onClick={() => onChange({ ...table, columns: table.columns.filter((c) => c.id !== col.id) })}><CloseIcon /></button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <button type="button" className="cv-btn cv-btn--small" onClick={() => onChange({ ...table, columns: [...table.columns, newColumn(`column_${table.columns.length + 1}`)] })}>
        {t('dbLoad.column.add')}
      </button>

      {previewRows.length > 0 && table.columns.length > 0 && (
        <div className="db-rows" aria-labelledby={`${id}-rows`}>
          <p className="db-rows__title" id={`${id}-rows`}>{t('dbLoad.table.preview', { count: built.rows.length })}</p>
          <div className="db-rows__scroll" dir="ltr">
            <table>
              <thead><tr>{table.columns.map((c) => <th key={c.id}>{c.name}</th>)}</tr></thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i}>{r.map((v, j) => <td key={j} className={v === null ? 'is-null' : undefined}>{v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ page part

/**
 * Load the JSON into a database: choose the database, map the data onto tables, get a script or files.
 * stateKey keeps the choices of each page apart (sessionStorage).
 */
const DbLoad = ({ items, rootName = 'data', stateKey }) => {
  const { t } = useTranslation()
  const [state, setState] = useSessionState(stateKey, { target: 'postgres', custom: null, output: 'script', options: DEFAULT_OPTIONS })
  const [selected, setSelected] = useState(null)
  const [importing, setImporting] = useState(false)
  const [fileIndex, setFileIndex] = useState(0)
  const [copied, copy] = useCopy()
  const target = state.target
  const options = { ...DEFAULT_OPTIONS, ...state.options }
  const family = TARGETS[target].family
  const output = family === 'es' ? 'script' : state.output
  const update = (patch) => setState((s) => ({ ...s, ...patch }))
  const setOption = (patch) => setState((s) => ({ ...s, options: { ...DEFAULT_OPTIONS, ...s.options, ...patch } }))

  // automatic tables follow the data until the user edits them
  const auto = useMemo(() => autoMapping(items, { rootName, flatten: !isDocumentTarget(target) }), [items, rootName, target])
  const mapping = state.custom ?? auto
  const lists = useMemo(() => listPaths(items), [items])
  const built = useMemo(() => buildTables(items, mapping), [items, mapping])
  const current = mapping.tables.find((tb) => tb.id === selected) ?? mapping.tables[0]

  const setMapping = (next) => update({ custom: next })
  const setTable = (table) => setMapping({ ...mapping, tables: mapping.tables.map((tb) => (tb.id === table.id ? table : tb)) })

  const result = useMemo(() => {
    try {
      return { ...generate(built, target, output, options) }
    } catch (e) {
      return { files: [], error: e.message }
    }
  }, [built, target, output, options.createTables, options.mode, options.transaction, options.batchSize, options.namespace]) // eslint-disable-line react-hooks/exhaustive-deps
  const file = result.files[Math.min(fileIndex, result.files.length - 1)]
  const previewText = file ? file.content.split('\n').slice(0, PREVIEW_LINES).join('\n') : ''
  const lineCount = file ? file.content.split('\n').length - 1 : 0
  const keyless = mapping.tables.filter((tb) => !tb.columns.some((c) => c.key)).map((tb) => tb.name)
  const totalIssues = built.reduce((n, b) => n + [...b.issues.values()].reduce((a, v) => a + v, 0), 0)
  const namespaceLabel = TARGETS[target].namespace

  return (
    <div className="db">
      {/* 1. database */}
      <section className="db-step" aria-labelledby="db-step-1">
        <h3 className="db-step__title" id="db-step-1"><span className="db-step__n">1</span>{t('dbLoad.steps.target')}</h3>
        <div className="db-targets">
          {GROUPS.map(([group, ids]) => (
            <fieldset key={group} className="db-targets__group">
              <legend>{t(`dbLoad.groups.${group}`)}</legend>
              <div className="db-targets__list">
                {ids.map((tid) => (
                  <label key={tid} className={`db-target${target === tid ? ' is-on' : ''}`}>
                    <input type="radio" name="db-target" checked={target === tid}
                      onChange={() => {
                        // switching between tables and documents changes the automatic mapping
                        const changesShape = isDocumentTarget(tid) !== isDocumentTarget(target)
                        update({ target: tid, ...(changesShape ? { custom: null } : {}) })
                        setFileIndex(0)
                      }} />
                    {TARGETS[tid].label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {/* 2. tables */}
      <section className="db-step" aria-labelledby="db-step-2">
        <div className="db-step__bar">
          <h3 className="db-step__title" id="db-step-2">
            <span className="db-step__n">2</span>{t(isDocumentTarget(target) ? 'dbLoad.steps.collections' : 'dbLoad.steps.tables')}
          </h3>
          <div className="db-step__tools">
            {family !== 'mongo' && family !== 'es' && (
              <button type="button" className="cv-btn cv-btn--small" onClick={() => setImporting(true)}>{t('dbLoad.import.button')}</button>
            )}
            {state.custom && (
              <button type="button" className="cv-btn cv-btn--small cv-btn--quiet" onClick={() => { update({ custom: null }); setSelected(null) }}>
                {t('dbLoad.table.auto')}
              </button>
            )}
          </div>
        </div>
        <p className="db-step__text">{state.custom ? t('dbLoad.table.customText') : isDocumentTarget(target) ? t('dbLoad.table.autoTextDocs') : t('dbLoad.table.autoText')}</p>

        <div className="db-map">
          <ul className="db-tables" aria-label={t('dbLoad.steps.tables')}>
            {mapping.tables.map((tb) => {
              const b = built.find((x) => x.table === tb)
              const issues = b ? [...b.issues.values()].reduce((a, v) => a + v, 0) : 0
              return (
                <li key={tb.id}>
                  <button type="button" className={`db-table${current?.id === tb.id ? ' is-on' : ''}`} aria-pressed={current?.id === tb.id}
                    onClick={() => setSelected(tb.id)}>
                    <span className="db-table__name" dir="ltr">{tb.name || '…'}</span>
                    <span className="db-table__meta">
                      {tb.rowsFrom ? t('dbLoad.table.eachOf', { list: tb.rowsFrom }) : t('dbLoad.table.eachItem')}
                    </span>
                    <span className="db-table__meta">
                      {t('dbLoad.table.rows', { count: b?.rows.length ?? 0 })}, {t('dbLoad.table.columns', { count: tb.columns.length })}
                    </span>
                    {issues > 0 && <span className="db-table__issue">{t('dbLoad.column.issue', { count: issues })}</span>}
                  </button>
                </li>
              )
            })}
            <li>
              <button type="button" className="db-table db-table--add" onClick={() => {
                const table = newTable(`table_${mapping.tables.length + 1}`)
                setMapping({ ...mapping, tables: [...mapping.tables, table] })
                setSelected(table.id)
              }}>
                {t('dbLoad.table.add')}
              </button>
            </li>
          </ul>

          {current
            ? <TableEditor
              key={current.id}
              table={current}
              items={items}
              lists={lists}
              built={built.find((b) => b.table === current)}
              onChange={setTable}
              onRemove={() => { setMapping({ ...mapping, tables: mapping.tables.filter((tb) => tb.id !== current.id) }); setSelected(null) }}
            />
            : <p className="db-step__text">{t('dbLoad.table.none')}</p>}
        </div>
      </section>

      {/* 3. output */}
      <section className="db-step" aria-labelledby="db-step-3">
        <h3 className="db-step__title" id="db-step-3"><span className="db-step__n">3</span>{t('dbLoad.steps.output')}</h3>
        <div className="db-options">
          <div className="db-seg" role="radiogroup" aria-label={t('dbLoad.output.kind')}>
            {(family === 'es' ? ['script'] : ['script', 'files']).map((kind) => (
              <label key={kind} className={output === kind ? 'is-on' : undefined}>
                <input type="radio" name="db-output" checked={output === kind} onChange={() => { update({ output: kind }); setFileIndex(0) }} />
                <strong>{t(`dbLoad.output.${family}.${kind}`)}</strong>
                <span>{t(`dbLoad.output.${family}.${kind}Hint`)}</span>
              </label>
            ))}
          </div>
          <div className="db-options__row">
            <label className="cv-select-label">
              <span>{t('dbLoad.options.mode')}</span>
              <select className="cv-select" value={options.mode} onChange={(e) => setOption({ mode: e.target.value })}>
                {MODES.map((m) => <option key={m} value={m}>{t(`dbLoad.modes.${m}`)}</option>)}
              </select>
            </label>
            {namespaceLabel && (
              <label className="cv-select-label">
                <span>{t(`dbLoad.namespace.${namespaceLabel}`)}</span>
                <input className="cv-input cv-input--key db-options__ns" value={options.namespace} dir="ltr" spellCheck="false"
                  placeholder={t('dbLoad.namespace.optional')} onChange={(e) => setOption({ namespace: e.target.value })} />
              </label>
            )}
            {family === 'es' && (
              <label className="cv-select-label">
                <span>{t('dbLoad.namespace.indexPrefix')}</span>
                <input className="cv-input cv-input--key db-options__ns" value={options.namespace} dir="ltr" spellCheck="false"
                  placeholder="prod-" onChange={(e) => setOption({ namespace: e.target.value })} />
              </label>
            )}
            {output === 'script' && (family === 'sql' || family === 'cql') && (
              <label className="db-check">
                <input type="checkbox" className="cv-check" checked={options.createTables} onChange={(e) => setOption({ createTables: e.target.checked })} />
                {t('dbLoad.options.createTables')}
              </label>
            )}
            {output === 'script' && family === 'sql' && (
              <label className="db-check">
                <input type="checkbox" className="cv-check" checked={options.transaction} onChange={(e) => setOption({ transaction: e.target.checked })} />
                {t('dbLoad.options.transaction')}
              </label>
            )}
            {output === 'script' && family !== 'es' && (
              <label className="cv-select-label">
                <span>{t('dbLoad.options.batch')}</span>
                <select className="cv-select" value={options.batchSize} onChange={(e) => setOption({ batchSize: Number(e.target.value) })}>
                  {[1, 50, 100, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
          {options.mode !== 'insert' && keyless.length > 0 && (
            <p className="db-warn">{t('dbLoad.warnings.noKey', { tables: keyless.join(', ') })}</p>
          )}
          {totalIssues > 0 && <p className="db-warn">{t('dbLoad.warnings.issues', { count: totalIssues })}</p>}
        </div>

        {result.error
          ? <p className="cv-banner cv-banner--error" role="alert">{result.error}</p>
          : file && (
            <div className="db-out">
              <div className="db-out__bar">
                <div className="db-out__files" role="tablist" aria-label={t('dbLoad.output.files')}>
                  {result.files.map((f, i) => (
                    <button key={f.name} type="button" role="tab" aria-selected={f === file} className="db-out__file" onClick={() => setFileIndex(i)} dir="ltr">
                      {f.name}
                    </button>
                  ))}
                </div>
                <div className="db-out__actions">
                  <button type="button" className="cv-btn cv-btn--small" onClick={() => copy('file', file.content)}>
                    {copied === 'file' ? <CheckIcon /> : <CopyIcon />}{copied === 'file' ? t('converter.actions.copied') : t('common.copy')}
                  </button>
                  <button type="button" className="cv-btn cv-btn--small cv-btn--primary" onClick={() => download(file.content, file.name, file.mime)}>
                    <DownloadIcon />{t('dbLoad.output.download', { name: file.name })}
                  </button>
                  {result.files.length > 1 && (
                    <button type="button" className="cv-btn cv-btn--small" onClick={() => result.files.forEach((f, i) => setTimeout(() => download(f.content, f.name, f.mime), i * 300))}>
                      {t('dbLoad.output.downloadAll', { count: result.files.length })}
                    </button>
                  )}
                </div>
              </div>
              {lineCount > PREVIEW_LINES && <p className="cv-note">{t('dbLoad.output.truncated', { shown: PREVIEW_LINES, total: lineCount })}</p>}
              <pre className="cv-code db-out__code" dir="ltr" tabIndex={0}>
                <code>{/\.(json|ndjson)$/.test(file.name) ? highlightJson(previewText) : previewText}</code>
              </pre>
              {result.commands && (
                <div className="db-cmd">
                  <div className="db-cmd__bar">
                    <span>{t('dbLoad.output.commands')}</span>
                    <button type="button" className="cv-btn cv-btn--small cv-btn--quiet" onClick={() => copy('cmd', result.commands)}>
                      {copied === 'cmd' ? <CheckIcon /> : <CopyIcon />}{copied === 'cmd' ? t('converter.actions.copied') : t('common.copy')}
                    </button>
                  </div>
                  <pre className="db-cmd__code" dir="ltr"><code>{result.commands}</code></pre>
                </div>
              )}
            </div>
          )}
      </section>

      {importing && (
        <ImportTables items={items} onClose={() => setImporting(false)}
          onImport={(m) => { setMapping(m); setSelected(null); setImporting(false) }} />
      )}
    </div>
  )
}

export default DbLoad
