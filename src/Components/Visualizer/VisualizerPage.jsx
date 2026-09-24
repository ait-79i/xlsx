import { useCallback, useEffect, useMemo, useState } from 'react'
import JsonGraph from '../Flow/JsonGraph'
import SchemaDiagram from '../Flow/SchemaDiagram'
import DataSourceBar from './DataSourceBar'
import ExportPanel from './ExportPanel'
import { EXAMPLE_SQL } from './examples'
import { applySchemaOverrides, inferSchema } from '../../utils/schemaInference'
import { parseSqlSchema } from '../../utils/sqlParser'
import { useSessionState } from '../../utils/useSessionState'

const TABS = [
  { id: 'graph', label: 'JSON graph' },
  { id: 'schema', label: 'Database schema' },
  { id: 'export', label: 'SQL & export' },
]

const NO_OVERRIDES = { tableNames: {}, columnTypes: {} }

const hasData = (data) => data !== null && data !== undefined

const VisualizerPage = ({ data, setData }) => {
  const [tab, setTab] = useSessionState('visualizerTab', 'graph')
  const [source, setSource] = useSessionState('schemaSource', 'json') // json | sql
  const [sql, setSql] = useSessionState('schemaSql', '')
  const [parsed, setParsed] = useState(() => (sql.trim() ? parseSqlSchema(sql) : null))
  const [overrides, setOverrides] = useState(NO_OVERRIDES)
  const [notice, setNotice] = useState('')

  const inferred = useMemo(() => (hasData(data) ? inferSchema(data) : null), [data])
  const baseSchema = source === 'json' ? inferred : parsed?.schema ?? null

  // the edits belong to one schema: forget them when the schema is replaced
  useEffect(() => {
    setOverrides(NO_OVERRIDES)
  }, [baseSchema])

  const schema = useMemo(() => applySchemaOverrides(baseSchema, overrides), [baseSchema, overrides])

  const renameTable = useCallback((tableId, name) => {
    if (schema?.tables.some((t) => t.id !== tableId && t.name === name)) {
      setNotice(`A table named "${name}" already exists.`)
      return false
    }
    setNotice('')
    setOverrides((prev) => ({ ...prev, tableNames: { ...prev.tableNames, [tableId]: name } }))
    return true
  }, [schema])

  const setColumnType = useCallback((tableId, column, type) => {
    setOverrides((prev) => ({ ...prev, columnTypes: { ...prev.columnTypes, [`${tableId}::${column}`]: type } }))
  }, [])

  const drawSql = (text = sql) => {
    setSql(text)
    setParsed(parseSqlSchema(text))
  }

  const hasRows = source === 'json' && !!schema?.tables.some((t) => t.rows?.length > 0)

  return (
    <div className="container-fluid py-3">
      <DataSourceBar data={data} setData={setData} />

      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.id}>
            <button className={`nav-link ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'graph' && (
        hasData(data)
          ? <JsonGraph data={data} />
          : <div className="alert alert-secondary">
            Load a JSON or Excel file above, or send data here from the <em>Excel to json</em>,{' '}
            <em>json structure</em> or <em>Test API</em> pages with the <strong>Visualize</strong> button.
          </div>
      )}

      {tab === 'schema' && (
        <>
          <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
            <div className="btn-group btn-group-sm" role="group">
              <button className={`btn ${source === 'json' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setSource('json')}>
                From the JSON data
              </button>
              <button className={`btn ${source === 'sql' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setSource('sql')}>
                From SQL (CREATE TABLE)
              </button>
            </div>
            {source === 'json' && (
              <span className="small text-muted">
                Tables inferred from the data: nested objects and arrays become related tables.
              </span>
            )}
            {notice && <span className="small text-danger">{notice}</span>}
          </div>

          {source === 'sql' && (
            <div className="mb-3">
              <textarea
                className="form-control sql-input mb-2"
                placeholder="Paste CREATE TABLE statements (PostgreSQL, MySQL, SQLite, SQL Server)…"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
              />
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <button className="btn btn-sm btn-dark" onClick={() => drawSql()}>Draw diagram</button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => drawSql(EXAMPLE_SQL)}>Load example</button>
                <label className="btn btn-sm btn-outline-secondary mb-0">
                  Open .sql file
                  <input
                    type="file"
                    accept=".sql,.txt"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files[0]
                      e.target.value = ''
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => drawSql(reader.result)
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>
              {parsed?.errors.length > 0 && (
                <ul className="small text-danger mt-2 mb-0">
                  {parsed.errors.map((err) => <li key={err}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          {schema && schema.tables.length > 0
            ? <SchemaDiagram schema={schema} onRenameTable={renameTable} onColumnTypeChange={setColumnType} />
            : source === 'json' && (
              <div className="alert alert-secondary">Load some JSON data first, or switch to <em>From SQL</em>.</div>
            )}
        </>
      )}

      {tab === 'export' && (
        <ExportPanel schema={schema} data={data} hasRows={hasRows} />
      )}
    </div>
  )
}

export default VisualizerPage
