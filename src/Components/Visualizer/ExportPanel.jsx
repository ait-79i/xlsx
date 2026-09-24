import { useMemo, useState } from 'react'
import { DIALECTS, generateMermaid, generateSql } from '../../utils/sqlGenerator'
import { downloadJsonAsExcel, downloadSchemaAsExcel } from '../../utils/excelExport'
import { useTranslation } from 'react-i18next'

const PREVIEW_LINES = 400

const downloadText = (text, fileName, type) => {
  const link = document.createElement('a')
  link.download = fileName
  link.href = URL.createObjectURL(new Blob([text], { type }))
  link.click()
  URL.revokeObjectURL(link.href)
}

const ExportPanel = ({ schema, data, hasRows }) => {
  const { t } = useTranslation()
  const [format, setFormat] = useState('sql')
  const [dialect, setDialect] = useState('postgres')
  const [includeData, setIncludeData] = useState(true)
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    if (!schema || schema.tables.length === 0) return ''
    return format === 'sql'
      ? generateSql(schema, { dialect, includeData: hasRows && includeData })
      : generateMermaid(schema)
  }, [schema, format, dialect, includeData, hasRows])

  const lines = output.split('\n')
  const preview = lines.length > PREVIEW_LINES ? lines.slice(0, PREVIEW_LINES).join('\n') : output

  const copy = () => {
    navigator.clipboard?.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!schema || schema.tables.length === 0) {
    return <div className="alert alert-secondary">{t('export.noSchema')}</div>
  }

  return (
    <div className="row g-3">
      <div className="col-lg-3">
        <div className="card">
          <div className="card-body d-flex flex-column gap-3">
            <div>
              <label className="form-label fw-bold small">{t('export.format')}</label>
              <select className="form-select form-select-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="sql">SQL (CREATE TABLE{hasRows ? ' + INSERT' : ''})</option>
                <option value="mermaid">{t('export.mermaid')}</option>
              </select>
            </div>

            {format === 'sql' && (
              <>
                <div>
                  <label className="form-label fw-bold small">{t('export.database')}</label>
                  <select className="form-select form-select-sm" value={dialect} onChange={(e) => setDialect(e.target.value)}>
                    {Object.entries(DIALECTS).map(([value, d]) => <option key={value} value={value}>{d.label}</option>)}
                  </select>
                </div>
                {hasRows && (
                  <div className="form-check">
                    <input
                      id="include-data"
                      className="form-check-input"
                      type="checkbox"
                      checked={includeData}
                      onChange={(e) => setIncludeData(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="include-data">{t('export.includeData')}</label>
                  </div>
                )}
              </>
            )}

            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={copy}>{copied ? `${t('common.copied')} ✓` : t('common.copy')}</button>
              <button
                className="btn btn-sm btn-dark"
                onClick={() => format === 'sql'
                  ? downloadText(output, `schema-${dialect}.sql`, 'application/sql')
                  : downloadText(output, 'schema.mmd', 'text/plain')}
              >
                {t('common.download')}
              </button>
            </div>

            <hr className="my-0" />

            <div className="d-flex flex-column gap-2">
              <span className="fw-bold small">{t('export.excel')}</span>
              {hasRows && (
                <button className="btn btn-sm btn-outline-success" onClick={() => downloadSchemaAsExcel(schema)}>
                  {t('export.tablesToExcel')}
                </button>
              )}
              {data !== null && data !== undefined && (
                <button className="btn btn-sm btn-outline-success" onClick={() => downloadJsonAsExcel(data)}>
                  {t('export.jsonToExcel')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-9">
        {lines.length > PREVIEW_LINES && (
          <div className="small text-muted mb-1">
            {t('export.previewTruncated', { shown: PREVIEW_LINES, total: lines.length })}
          </div>
        )}
        <pre className="code-preview" dir="ltr">{preview}</pre>
      </div>
    </div>
  )
}

export default ExportPanel
