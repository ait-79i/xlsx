import { useRef, useState } from 'react'
import { readExcelFile } from '../Drag&Drop/DropExcelFile'
import { validateFile } from '../CommanFunctions'
import { EXAMPLE_JSON } from './examples'

const describe = (data) => {
  if (data === null || data === undefined) return 'No data loaded'
  if (Array.isArray(data)) return `Array of ${data.length} item${data.length > 1 ? 's' : ''}`
  if (typeof data === 'object') return `Object with ${Object.keys(data).length} keys`
  return `Value: ${String(data).slice(0, 40)}`
}

// Loads the data shown by the visualizer: JSON or Excel file, pasted JSON, or the sample
const DataSourceBar = ({ data, setData }) => {
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
          setError(`Invalid JSON: ${e.message}`)
        }
      }
      reader.readAsText(file)
    } else if (validateFile(file.name)) {
      readExcelFile(file).then(setData).catch(() => setError('Could not read the Excel file'))
    } else {
      setError('File extension not supported!')
    }
  }

  const applyPaste = () => {
    try {
      setData(JSON.parse(text))
      setPasting(false)
      setText('')
      setError('')
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`)
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
          <strong>Data:</strong> {describe(data)}
          <span className="text-muted small ms-2">(drop a .json or Excel file here)</span>
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
        <button className="btn btn-sm btn-outline-secondary" onClick={() => inputRef.current.click()}>Open file</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setPasting(!pasting)}>Paste JSON</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setData(EXAMPLE_JSON)}>Load sample</button>
        {data !== null && data !== undefined && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => setData(null)}>Clear</button>
        )}
      </div>

      {pasting && (
        <div className="card-body pt-0">
          <textarea
            className="form-control sql-input mb-2"
            placeholder='[{"id": 1, "name": "..."}]'
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-sm btn-dark" onClick={applyPaste}>Load</button>
        </div>
      )}

      {error && <div className="card-body pt-0 text-danger small">{error}</div>}
    </div>
  )
}

export default DataSourceBar
