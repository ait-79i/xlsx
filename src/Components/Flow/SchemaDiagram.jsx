"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslation } from 'react-i18next'
import './flow.css'
import TableNode, { SchemaContext } from './TableNode'
import { downloadFlowAsPng } from './exportImage'
import { schemaRelations } from '../../utils/schemaInference'
import { layoutGraph } from '../../utils/layout'

const nodeTypes = { table: TableNode }

const tableNodeSize = (node) => ({
  width: 280,
  height: 36 + node.data.table.columns.length * 26 + 2,
})

function schemaToFlow(schema) {
  const nodes = schema.tables.map((table) => ({
    id: table.id,
    type: 'table',
    position: { x: 0, y: 0 },
    data: { table },
  }))
  const hasColumn = (tableId, column) =>
    schema.tables.some((t) => t.id === tableId && t.columns.some((c) => c.name === column))

  // edge from the referenced (parent) key to the foreign key column
  const edges = schemaRelations(schema)
    .filter((rel) => hasColumn(rel.to.tableId, rel.to.column) && hasColumn(rel.from.tableId, rel.from.column))
    .map((rel) => ({
      id: rel.id,
      source: rel.to.tableId,
      sourceHandle: `${rel.to.column}-s`,
      target: rel.from.tableId,
      targetHandle: `${rel.from.column}-t`,
      type: 'smoothstep',
      label: rel.cardinality,
      labelBgPadding: [4, 2],
      labelStyle: { fontSize: 11, fontWeight: 600 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    }))
  return { nodes, edges }
}

// Only a change of tables, columns or relations requires a new layout;
// renaming a table or changing a type keeps the positions chosen by the user.
const structureKey = (schema) =>
  JSON.stringify(
    schema.tables.map((t) => [t.id, t.columns.map((c) => [c.name, c.fk?.tableId ?? null])])
  )

function SchemaDiagramFlow({ schema, onRenameTable, onColumnTypeChange }) {
  const { t } = useTranslation()
  const wrapper = useRef(null)
  const lastKey = useRef(null)
  const [selected, setSelected] = useState([])
  const { fitView, getNodes } = useReactFlow()

  const flow = useMemo(() => schemaToFlow(schema), [schema])
  const layoutKey = useMemo(() => structureKey(schema), [schema])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const relayout = () => setNodes(layoutGraph(flow.nodes, flow.edges, { getSize: tableNodeSize, ranksep: 120 }))

  useEffect(() => {
    const structureChanged = lastKey.current !== layoutKey
    lastKey.current = layoutKey
    if (structureChanged) {
      setNodes(layoutGraph(flow.nodes, flow.edges, { getSize: tableNodeSize, ranksep: 120 }))
    } else {
      setNodes((prev) => {
        const positions = new Map(prev.map((n) => [n.id, n.position]))
        return flow.nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }))
      })
    }
    setEdges(flow.edges)
  }, [flow, layoutKey, setNodes, setEdges])

  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 100)
    return () => clearTimeout(timer)
  }, [layoutKey, fitView])

  // highlight the relations of the selected tables
  const displayedEdges = useMemo(() => {
    if (selected.length === 0) return edges
    return edges.map((e) =>
      selected.includes(e.source) || selected.includes(e.target)
        ? { ...e, animated: true, className: 'is-highlighted' }
        : e
    )
  }, [edges, selected])

  const context = useMemo(
    () => ({ renameTable: onRenameTable, setColumnType: onColumnTypeChange }),
    [onRenameTable, onColumnTypeChange]
  )

  // stable handler that keeps the same array when the selection didn't change:
  // React Flow calls it again whenever the handler changes, which would loop forever
  const onSelectionChange = useCallback(({ nodes: selectedNodes }) => {
    const ids = selectedNodes.map((n) => n.id)
    setSelected((prev) => (prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids))
  }, [])

  const rowCount = schema.tables.reduce((sum, t) => sum + (t.rows?.length ?? 0), 0)

  return (
    <SchemaContext.Provider value={context}>
      <div className="flow-canvas" ref={wrapper} dir="ltr">
        <ReactFlow
          nodes={nodes}
          edges={displayedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e9ecef" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor="#011638" />

          <Panel position="top-left">
            <div className="flow-toolbar">
              <span className="small">
                {t('schema.tableCount', { count: schema.tables.length })} · {t('schema.relationCount', { count: edges.length })}
                {rowCount > 0 && <> · {t('schema.rows', { count: rowCount })}</>}
              </span>
              <button className="btn btn-sm btn-outline-secondary" title={t('schema.relayoutTitle')} onClick={relayout}>
                {t('graph.relayout')}
              </button>
              <button className="btn btn-sm btn-dark" onClick={() => downloadFlowAsPng(wrapper.current, getNodes(), 'database-schema.png')}>
                {t('graph.exportPng')}
              </button>
            </div>
          </Panel>

          <Panel position="bottom-center">
            <div className="flow-legend">
              {t('schema.help')}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </SchemaContext.Provider>
  )
}

const SchemaDiagram = (props) => (
  <ReactFlowProvider>
    <SchemaDiagramFlow {...props} />
  </ReactFlowProvider>
)

export default SchemaDiagram
