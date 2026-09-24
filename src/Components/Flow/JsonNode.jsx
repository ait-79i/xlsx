import { createContext, memo, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { isRowMatch, ROOT_ID } from '../../utils/jsonGraph'

export const JsonGraphContext = createContext({
  search: '',
  activeId: null,
  toggleNode: () => { },
  copyPath: () => { },
})

const formatValue = (row) => {
  if (row.type === 'string') return JSON.stringify(row.value)
  if (row.type === 'null') return 'null'
  return String(row.value)
}

const sizeLabel = (type, size) => (type === 'array' ? `[${size}]` : `{${size}}`)

function JsonNode({ id, data }) {
  const { t } = useTranslation()
  const { search, activeId, toggleNode, copyPath } = useContext(JsonGraphContext)
  const term = search.trim().toLowerCase()
  const matched = term !== '' && (
    data.label.toLowerCase().includes(term) || data.rows.some((row) => isRowMatch(row, search))
  )

  return (
    <div className={`json-node ${matched ? 'is-match' : ''} ${activeId === id ? 'is-active' : ''}`}>
      {id !== ROOT_ID && <Handle type="target" position={Position.Left} isConnectable={false} />}

      <div className={`json-node__header json-node__header--${data.kind}`} title={data.jsonPath}>
        <span className="json-node__label">{data.label}</span>
        {data.size !== null && <span className="json-node__badge">{sizeLabel(data.kind, data.size)}</span>}
      </div>

      {data.rows.map((row) => (
        <div
          key={row.key}
          className={`json-node__row ${isRowMatch(row, search) ? 'is-match' : ''}`}
          title={row.childId
            ? `${row.jsonPath}\n${row.collapsed ? t('graph.clickToExpand') : t('graph.clickToCollapse')}`
            : `${row.jsonPath}\n${formatValue(row)}\n${t('graph.clickToCopyPath')}`}
          onClick={() => (row.childId ? toggleNode(row.childId) : copyPath(row.jsonPath))}
        >
          <span className="json-node__key">{row.key}</span>
          {row.childId
            ? <span className="json-node__nested">{row.collapsed ? '▸' : '▾'} {sizeLabel(row.type, row.size)}</span>
            : <span className={`json-node__value json-node__value--${row.type}`}>{formatValue(row)}</span>}
          {row.childId && <Handle type="source" position={Position.Right} id={row.key} isConnectable={false} />}
        </div>
      ))}

      {data.hidden > 0 && <div className="json-node__more">… {t('graph.moreItems', { count: data.hidden })}</div>}
    </div>
  )
}

export default memo(JsonNode)
