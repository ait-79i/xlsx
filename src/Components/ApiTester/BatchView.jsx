"use client";

import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon } from '../Converter/icons'
import { download } from '../Converter/Actions'
import { batchReport, summarize } from '../../utils/batch'
import { formatMs, statusTone } from '../../utils/http'

/** Progress and results of "one request per item". */
const BatchView = ({ batch, onStop, onRetryFailed, onClose }) => {
  const { t } = useTranslation()
  const [onlyFailed, setOnlyFailed] = useState(false)
  const counts = useMemo(() => summarize(batch.results), [batch.results])
  const percent = batch.total ? Math.round((counts.done / batch.total) * 100) : 0
  const rows = batch.results
    .map((r, i) => r ?? (batch.running ? null : { index: i, skipped: true }))
    .filter((r) => r && (!onlyFailed || !r.ok))

  return (
    <div className="at-batch">
      <div className={`at-batch__head${batch.running ? '' : counts.failed ? ' has-failed' : ' is-done'}`}>
        <div className="at-batch__numbers">
          <span className="at-batch__done">{counts.done}<span className="at-batch__total"> / {batch.total}</span></span>
          <span className="at-batch__label">
            {batch.running
              ? t('apiTester.batch.running')
              : batch.stopped ? t('apiTester.batch.stopped') : t('apiTester.batch.finished')}
          </span>
        </div>
        <div className="at-batch__counts">
          <span className="at-batch__ok">{t('apiTester.batch.ok', { count: counts.ok })}</span>
          <span className="at-batch__failed">{t('apiTester.batch.failed', { count: counts.failed })}</span>
          {!batch.running && batch.ms !== undefined && <span>{formatMs(batch.ms)}</span>}
        </div>
        <div className="at-batch__bar" role="progressbar" aria-valuemin={0} aria-valuemax={batch.total} aria-valuenow={counts.done}
          aria-label={t('apiTester.batch.progress')}>
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="at-batch__tools">
        {batch.running
          ? <button type="button" className="cv-btn cv-btn--small" onClick={onStop}>{t('apiTester.batch.stop')}</button>
          : <>
            {counts.failed > 0 && (
              <button type="button" className="cv-btn cv-btn--small cv-btn--primary" onClick={onRetryFailed}>
                {t('apiTester.batch.retry', { count: counts.failed })}
              </button>
            )}
            <button type="button" className="cv-btn cv-btn--small"
              onClick={() => download(batchReport(batch.results, batch.urls), 'batch-report.csv', 'text/csv')}>
              <DownloadIcon />{t('apiTester.batch.report')}
            </button>
            <button type="button" className="cv-btn cv-btn--small cv-btn--quiet" onClick={onClose}>{t('mappings.dismiss')}</button>
          </>}
        <label className="at-batch__filter">
          <input type="checkbox" className="cv-check" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          {t('apiTester.batch.onlyFailed')}
        </label>
      </div>

      <div className="at-batch__table-wrap">
        <table className="at-batch__table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">{t('apiTester.batch.colStatus')}</th>
              <th scope="col">{t('apiTester.batch.colUrl')}</th>
              <th scope="col">{t('apiTester.batch.colTime')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.index} className={r.ok ? undefined : 'is-failed'}>
                <td className="at-batch__index">{r.index + 1}</td>
                <td>
                  {r.skipped
                    ? <span className="at-batch__status is-skipped">{t('apiTester.batch.notSent')}</span>
                    : r.status
                      ? <span className={`at-batch__status is-${statusTone(r.status)}`}>{r.status}</span>
                      : <span className="at-batch__status is-server">{t(`apiTester.batch.errors.${r.error}`, { defaultValue: r.error })}</span>}
                </td>
                <td className="at-batch__url" dir="ltr">
                  <span title={batch.urls[r.index]}>{batch.urls[r.index]}</span>
                  {r.detail && <span className="at-batch__detail" title={r.detail}>{r.detail}</span>}
                </td>
                <td className="at-batch__ms">{r.ms !== undefined ? formatMs(r.ms) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="at-res__empty">{onlyFailed ? t('apiTester.batch.noFailed') : t('apiTester.batch.starting')}</p>}
      </div>
    </div>
  )
}

export default BatchView
