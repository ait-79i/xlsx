import React from 'react'
import { useTranslation } from 'react-i18next'
import { downloadJsonAsExcel } from '../utils/excelExport'

const DownloadExcel = ({ data }) => {
  const { t } = useTranslation()
  return (
    <button className=' btn ' onClick={() => downloadJsonAsExcel(data)}>{t('actions.downloadExcel')}</button>
  )
}

export default DownloadExcel
