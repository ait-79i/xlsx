import { useRef, useState } from 'react'
import { readExcelFile } from '../Drag&Drop/DropExcelFile'
import { validateFile } from '../CommanFunctions'
import { EXAMPLE_JSON } from './examples'
import { useTranslation } from 'react-i18next'

const describe = (data, t) => {
  if (data === null || data === undefined) return t('visualizer.noData')
  if (Array.isArray(data)) return t('visualizer.arrayOf', { count: data.length })
  if (typeof data === 'object') return t('visualizer.objectWith', { count: Object.keys(data).length })
  return t('visualizer.value', { value: String(data).slice(0, 40) })
}

// Loads the data shown by the visualizer: JSON or Excel file, pasted JSON, or the sample
const DataSourceBar = ({ data, setData }) => {
  const { t } = useTranslation()
  const inputRef = useRef()
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const loadFile = (file) => {
    if (!file) return
    setError('')
    if (/\.json$/i.test(file.name)) {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          setData(JSON.parse(reader.result))
        } catch (e) {
          setError(t('errors.invalidJson', { message: e.message }))
        }
      }
      reader.readAsText(file)
    } else if (validateFile(file.name)) {
      readExcelFile(file).then(setData).catch(() => setError(t('errors.excelRead')))
    } else {
      setError(t('dropzone.extensionNotSupported'))
    }
  }

  const applyPaste = () => {
    try {
      setData(JSON.parse(text))
      setPasting(false)
      setText('')
      setError('')
    } catch (e) {
      setError(t('errors.invalidJson', { message: e.message }))
    }
  }

  return (
    <div
      className="card mb-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        loadFile(e.dataTransfer.files[0])
      }}
    >
      <div className="card-body py-2 d-flex flex-wrap align-items-center gap-2">
        <span className="me-auto">
          <strong>{t('visualizer.data')}</strong> {describe(data, t)}
          <span className="text-muted small ms-2">({t('visualizer.dropHint')})</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.xlsx,.xlsm,.xlsb,.xls,.xlam"
          hidden
          onChange={(e) => {
            loadFile(e.target.files[0])
            e.target.value = ''
          }}
        />
        <button className="btn btn-sm btn-outline-secondary" onClick={() => inputRef.current.click()}>{t('visualizer.openFile')}</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setPasting(!pasting)}>{t('visualizer.pasteJson')}</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setData(EXAMPLE_JSON)}>{t('visualizer.loadSample')}</button>
        {data !== null && data !== undefined && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => setData(null)}>{t('common.clear')}</button>
        )}
      </div>

      {pasting && (
        <div className="card-body pt-0">
          <textarea
            className="form-control sql-input mb-2"
            dir="ltr"
            placeholder='[{"id": 1, "name": "..."}]'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-sm btn-dark" onClick={applyPaste}>{t('common.load')}</button>
        </div>
      )}

      {error && <div className="card-body pt-0 text-danger small">{error}</div>}
    </div>
  )
}

export default DataSourceBar
