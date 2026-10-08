"use client";

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const PAGE = 100

const display = (v) => (v === null || v === undefined ? '' : String(v))

/**
 * The spreadsheet, with an extra header row showing the JSON key every column ends up under.
 * Ticking a column header selects its key in the structure.
 */
const Sheet = ({ sheet, fields, selected, onToggle, sheets, active, onSheetChange }) => {
  const { t } = useTranslation()
  const [limit, setLimit] = useState(PAGE)
  const rows = sheet.rows.slice(0, limit)
  const isPicked = (i) => selected.has(fields.get(i)?.id)

  return (
    <figure className="cv-sheet" aria-label={t('converter.sheet.label', { name: sheet.name })}>
      <div className="cv-sheet__scroll" dir="ltr">
        <table className="cv-sheet__table">
          <thead>
            <tr className="cv-sheet__keys">
              <th className="cv-sheet__corner" scope="row">{t('converter.sheet.jsonRow')}</th>
              {sheet.columns.map((col, i) => {
                const field = fields.get(i)
                return (
                  <th key={col.letter} className={isPicked(i) ? 'is-picked' : undefined}>
                    {field?.include
                      ? <code className="cv-path">{field.path.map((k, n) => (
                        <React.Fragment key={n}>
                          {n > 0 && <span className="cv-path__dot">.</span>}
                          <span className={n < field.path.length - 1 ? 'cv-path__parent' : undefined}>{k}</span>
                        </React.Fragment>
                      ))}</code>
                      : <span className="cv-path cv-path--out">{t('converter.sheet.notIncluded')}</span>}
                  </th>
                )
              })}
            </tr>
            <tr className="cv-sheet__letters" aria-hidden="true">
              <th className="cv-sheet__corner" />
              {sheet.columns.map((col, i) => (
                <th key={col.letter} className={isPicked(i) ? 'is-picked' : undefined}>{col.letter}</th>
              ))}
            </tr>
            <tr>
              <th className="cv-sheet__rownum" aria-hidden="true">1</th>
              {sheet.columns.map((col, i) => {
                const field = fields.get(i)
                return (
                  <th key={col.letter} scope="col"
                    className={`cv-sheet__head${isPicked(i) ? ' is-picked' : ''}${field?.include ? '' : ' is-out'}`}>
                    <label className="cv-sheet__toggle">
                      <input
                        type="checkbox"
                        checked={isPicked(i)}
                        onChange={() => field && onToggle(field.id)}
                        aria-label={t('converter.sheet.selectColumn', { name: col.name })}
                      />
                      <span>{col.name}</span>
                    </label>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <th className="cv-sheet__rownum" scope="row">{r + 2}</th>
                {row.map((cell, i) => (
                  <td key={i}
                    className={[isPicked(i) && 'is-picked', fields.get(i)?.include === false && 'is-out', typeof cell === 'number' && 'is-num'].filter(Boolean).join(' ') || undefined}>
                    {display(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="cv-sheet__foot">
        <div className="cv-sheet__tabs" role="tablist" aria-label={t('converter.file.sheets')}>
          {sheets.map((s, i) => (
            <button
              key={`${i}-${s.name}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              className="cv-sheet__tab"
              onClick={() => { setLimit(PAGE); onSheetChange(i) }}
              title={t('converter.file.rows', { count: s.rows.length })}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="cv-sheet__count">
          {sheet.rows.length > rows.length && (
            <>
              <span>{t('converter.sheet.shown', { shown: rows.length, total: sheet.rows.length })}</span>
              <button type="button" className="cv-link" onClick={() => setLimit((l) => l + PAGE)}>
                {t('converter.sheet.showMore')}
              </button>
            </>
          )}
        </div>
      </figcaption>
    </figure>
  )
}

export default Sheet
