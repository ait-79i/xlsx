import { createContext, memo, useContext, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { COLUMN_TYPES } from '../../utils/schemaInference'

export const SchemaContext = createContext({
  renameTable: () => true,
  setColumnType: () => { },
})

function TableNode({ id, data }) {
  const { table } = data
  const { renameTable, setColumnType } = useContext(SchemaContext)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(table.name)

  useEffect(() => {
    setName(table.name)
  }, [table.name])

  const saveName = () => {
    setEditing(false)
    const newName = name.trim()
    if (newName === '' || newName === table.name || !renameTable(id, newName)) {
      setName(table.name)
    }
  }

  return (
    <div className="db-table">
      <div className="db-table__header" title="Double-click to rename" onDoubleClick={() => setEditing(true)}>
        {editing
          ? <input
            className="nodrag db-table__rename"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur()
              if (e.key === 'Escape') {
                setName(table.name)
                setEditing(false)
              }
            }}
          />
          : <span>{table.name}</span>}
        {table.rows?.length > 0 && <span className="db-table__count">{table.rows.length} rows</span>}
      </div>

      {table.columns.map((col) => (
        <div key={col.name} className={`db-table__row ${col.pk ? 'is-pk' : ''}`}>
          <Handle type="target" position={Position.Left} id={`${col.name}-t`} isConnectable={false} />
          <span className="db-table__keys">
            {col.pk && <span className="db-badge db-badge--pk" title="Primary key">PK</span>}
            {col.fk && <span className="db-badge db-badge--fk" title="Foreign key">FK</span>}
          </span>
          <span
            className={`db-table__col ${col.nullable ? 'is-nullable' : ''}`}
            title={`${col.name}${col.nullable ? ' (nullable)' : ' (not null)'}${col.unique ? ', unique' : ''}`}
          >
            {col.name}
          </span>
          <select
            className="nodrag db-table__type"
            value={col.type}
            title={col.rawType ?? 'Change the column type'}
            onChange={(e) => setColumnType(id, col.name, e.target.value)}
          >
            {COLUMN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === col.type && col.rawType ? col.rawType.toLowerCase() : type}
              </option>
            ))}
          </select>
          <Handle type="source" position={Position.Right} id={`${col.name}-s`} isConnectable={false} />
        </div>
      ))}
    </div>
  )
}

export default memo(TableNode)
