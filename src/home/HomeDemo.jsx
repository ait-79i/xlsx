"use client";

import React, { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

const COLUMNS = ['name', 'email', 'city', 'zip']
const LETTERS = ['A', 'B', 'C', 'D']

const ROWS = [
  { name: 'Amina Benali', email: 'amina@atlas.ma', city: 'Casablanca', zip: '20250' },
  { name: 'Lucas Martin', email: 'lucas@lyon.fr', city: 'Lyon', zip: '69002' },
  { name: 'Sara El Idrissi', email: 'sara@rabat.ma', city: 'Rabat', zip: '10000' },
]

const Str = ({ children }) => <span className="j-str">"{children}"</span>
const Key = ({ children }) => <><span className="j-key">"{children}"</span><span className="j-pun">: </span></>
const Comma = ({ show }) => (show ? <span className="j-pun">,</span> : null)

// One row of the sheet as JSON entries; grouped columns are nested where the first one stood
const toEntries = (row, labels, grouped, groupKey) => {
  const entries = []
  let placed = false
  COLUMNS.forEach((col) => {
    if (!grouped.includes(col)) {
      entries.push({ key: labels[col], value: row[col] })
    } else if (!placed) {
      placed = true
      entries.push({
        key: groupKey,
        nested: COLUMNS.filter((c) => grouped.includes(c)).map((c) => [labels[c], row[c]]),
      })
    }
  })
  return entries
}

const HomeDemo = () => {
  const { t } = useTranslation()
  const id = useId()
  const [grouped, setGrouped] = useState(['city', 'zip'])
  // follows the interface language until the visitor types their own key
  const [customKey, setCustomKey] = useState(null)
  const groupKey = customKey ?? t('home.demo.defaultKey')
  // bumped on every change so the nested lines replay their highlight
  const [revision, setRevision] = useState(0)

  const labels = Object.fromEntries(COLUMNS.map((c) => [c, t(`home.demo.columns.${c}`)]))
  const key = groupKey.trim()
  const flatKeys = COLUMNS.filter((c) => !grouped.includes(c)).map((c) => labels[c])

  let error = null
  if (grouped.length > 0) {
    if (!key) error = t('structure.errors.emptyKey')
    else if (/^\d+$/.test(key)) error = t('structure.errors.keyMustBeText')
    else if (flatKeys.includes(key)) error = t('home.demo.keyTaken')
  }
  // keep the last valid preview on screen while the key is being fixed
  const [lastValidKey, setLastValidKey] = useState(key)
  if (!error && grouped.length > 0 && key !== lastValidKey) setLastValidKey(key)
  const shownKey = error ? lastValidKey : key

  const toggle = (col) => {
    setGrouped((g) => (g.includes(col) ? g.filter((c) => c !== col) : [...g, col]))
    setRevision((r) => r + 1)
  }

  const onKeyChange = (e) => {
    setCustomKey(e.target.value)
    setRevision((r) => r + 1)
  }

  return (
    <div className="demo">
      <div className="demo__toolbar">
        <label className="demo__key-label" htmlFor={`${id}-key`}>{t('home.demo.groupUnder')}</label>
        <input
          id={`${id}-key`}
          className="demo__key"
          value={groupKey}
          onChange={onKeyChange}
          spellCheck="false"
          autoComplete="off"
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          disabled={grouped.length === 0}
        />
        <p className={`demo__hint${error ? ' is-error' : ''}`} id={`${id}-hint`} role={error ? 'alert' : undefined}>
          {error ?? t('home.demo.hint')}
        </p>
      </div>

      <div className="demo__panes">
        <figure className="sheet" aria-label={t('home.demo.gridLabel')}>
          <div className="sheet__scroll">
            <table className="sheet__table">
              <thead>
                <tr className="sheet__letters" aria-hidden="true">
                  <th className="sheet__corner" />
                  {LETTERS.map((l, i) => (
                    <th key={l} className={grouped.includes(COLUMNS[i]) ? 'is-picked' : undefined}>{l}</th>
                  ))}
                </tr>
                <tr>
                  <th className="sheet__rownum" aria-hidden="true">1</th>
                  {COLUMNS.map((col) => (
                    <th key={col} scope="col" className={`sheet__head${grouped.includes(col) ? ' is-picked' : ''}`}>
                      <label className="sheet__toggle">
                        <input type="checkbox" checked={grouped.includes(col)} onChange={() => toggle(col)} />
                        <span dir="ltr">{labels[col]}</span>
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, r) => (
                  <tr key={row.email}>
                    <th className="sheet__rownum" aria-hidden="true">{r + 2}</th>
                    {COLUMNS.map((col) => (
                      <td key={col} dir="ltr" className={grouped.includes(col) ? 'is-picked' : undefined}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="sheet__tabs">
            <span className="sheet__tab">{t('home.demo.sheet')}</span>
          </figcaption>
        </figure>

        <svg className="demo__arrow" viewBox="0 0 48 24" width="48" height="24" aria-hidden="true" focusable="false">
          <path d="M2 12h40M33 4l9 8-9 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <figure className="code">
          <div className="code__bar">
            <span className="code__file">data.json</span>
          </div>
          <pre className="code__body" dir="ltr" aria-label={t('home.demo.jsonLabel')} tabIndex={0}>
            <code>
              <span className="j-line"><span className="j-pun">[</span></span>
              {ROWS.map((row, r) => {
                const entries = toEntries(row, labels, grouped, shownKey)
                return (
                  <React.Fragment key={row.email}>
                    <span className="j-line j-i1"><span className="j-pun">{'{'}</span></span>
                    {entries.map((entry, i) => {
                      const last = i === entries.length - 1
                      if (!entry.nested) {
                        return (
                          <span className="j-line j-i2" key={entry.key}>
                            <Key>{entry.key}</Key><Str>{entry.value}</Str><Comma show={!last} />
                          </span>
                        )
                      }
                      return (
                        <span className="j-line j-i2 j-nested" key={`nested-${revision}`}>
                          <Key>{entry.key}</Key>
                          <span className="j-pun">{'{ '}</span>
                          {entry.nested.map(([k, v], n) => (
                            <React.Fragment key={k}>
                              <Key>{k}</Key><Str>{v}</Str>
                              {n < entry.nested.length - 1 && <span className="j-pun">, </span>}
                            </React.Fragment>
                          ))}
                          <span className="j-pun">{' }'}</span><Comma show={!last} />
                        </span>
                      )
                    })}
                    <span className="j-line j-i1">
                      <span className="j-pun">{'}'}</span><Comma show={r < ROWS.length - 1} />
                    </span>
                  </React.Fragment>
                )
              })}
              <span className="j-line"><span className="j-pun">]</span></span>
            </code>
          </pre>
        </figure>
      </div>
    </div>
  )
}

export default HomeDemo
