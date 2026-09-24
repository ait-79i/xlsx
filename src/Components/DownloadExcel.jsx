import React from 'react'
import { downloadJsonAsExcel } from '../utils/excelExport'

const DownloadExcel = ({ data }) => {
  return (
    <button className=' btn ' onClick={() => downloadJsonAsExcel(data)}>Download Excel file</button>
  )
}

export default DownloadExcel
