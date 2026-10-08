"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslation } from 'react-i18next'
import './flow.css'
import JsonNode, { JsonGraphContext } from './JsonNode'
import { downloadFlowAsPng } from './exportImage'
import {
  containerIds,
  jsonNodeSize,
  jsonToGraph,
  JSON_NODE_WIDTH,
  searchNodes,
} from '../../utils/jsonGraph'
import { layoutGraph } from '../../utils/layout'

const nodeTypes = { json: JsonNode }
const ITEMS_OPTIONS = [5, 10, 25, 50, 100]

const miniMapColor = (node) => {
  if (node.data.kind === 'array') return '#4a4e69'
  if (node.data.kind === 'object') return '#011638'
  return '#adb5bd'
}

function JsonGraphFlow({ data }) {
  const { t } = useTranslation()
  const [maxItems, setMaxItems] = useState(10)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [matchIndex, setMatchIndex] = useState(-1)
  const [toast, setToast] = useState('')
  const wrapper = useRef(null)
  const { fitView, setCenter, getNode, getNodes, getViewport, setViewport } = useReactFlow()
  // node that must keep its place on screen after a collapse/expand re-layout
  const anchor = useRef(null)

  // new data: start again fully expanded
  useEffect(() => {
    setCollapsed(new Set())
    setSearch('')
  }, [data])

  const graph = useMemo(() => {
    const { nodes, edges, truncated } = jsonToGraph(data, { maxItems, collapsed })
    return { nodes: layoutGraph(nodes, edges, { getSize: jsonNodeSize }), edges, truncated }
  }, [data, maxItems, collapsed])

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    const moved = anchor.current && graph.nodes.find((n) => n.id === anchor.current.id)
    if (moved) {
      const { x, y, zoom } = getViewport()
      setViewport({
        x: x - (moved.position.x - anchor.current.x) * zoom,
        y: y - (moved.position.y - anchor.current.y) * zoom,
        zoom,
      })
    }
    anchor.current = null
  }, [graph, setNodes, setEdges, getViewport, setViewport])

  const [fitRequest, setFitRequest] = useState(0)
  const refit = () => setFitRequest((n) => n + 1)

  // re-center on new data, a new number of items or collapse/expand all, not on every toggle
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 100)
    return () => clearTimeout(timer)
  }, [data, maxItems, fitRequest, fitView])

  const matches = useMemo(() => searchNodes(graph.nodes, search), [graph.nodes, search])

  useEffect(() => {
    setMatchIndex(-1)
  }, [search])

  const goToMatch = (step) => {
    if (matches.length === 0) return
    const index = (matchIndex + step + matches.length) % matches.length
    setMatchIndex(index)
    const node = getNode(matches[index])
    if (node) {
      const height = node.measured?.height ?? jsonNodeSize(node).height
      setCenter(node.position.x + JSON_NODE_WIDTH / 2, node.position.y + height / 2, {
        zoom: 1.2,
        duration: 400,
      })
    }
  }

  const toggleNode = useCallback((id) => {
    const parentId = id.slice(0, id.lastIndexOf('/'))
    const parent = getNode(parentId)
    if (parent) anchor.current = { id: parentId, ...parent.position }
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [getNode])

  const copyPath = useCallback((path) => {
    navigator.clipboard?.writeText(path)
    setToast(t('graph.copiedPath', { path }))
  }, [t])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const context = useMemo(
    () => ({
      search,
      activeId: matchIndex >= 0 ? matches[matchIndex] : null,
      toggleNode,
      copyPath,
    }),
    [search, matchIndex, matches, toggleNode, copyPath]
  )

  return (
    <JsonGraphContext.Provider value={context}>
      <div className="flow-canvas" ref={wrapper} dir="ltr">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e9ecef" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={miniMapColor} />

          <Panel position="top-left">
            <div className="flow-toolbar">
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder={t('graph.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToMatch(e.shiftKey ? -1 : 1)}
              />
              {search.trim() !== '' && (
                <>
                  <span className="small text-muted">
                    {matches.length === 0 ? t('graph.noMatch') : `${matchIndex + 1 > 0 ? matchIndex + 1 : '–'} / ${matches.length}`}
                  </span>
                  <button className="btn btn-sm btn-outline-secondary" title={t('graph.previousMatch')} onClick={() => goToMatch(-1)}>↑</button>
                  <button className="btn btn-sm btn-outline-secondary" title={t('graph.nextMatch')} onClick={() => goToMatch(1)}>↓</button>
                </>
              )}
              <select
                className="form-select form-select-sm"
                title={t('graph.itemsPerArrayTitle')}
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
              >
                {ITEMS_OPTIONS.map((n) => <option key={n} value={n}>{t('graph.itemsPerArray', { count: n })}</option>)}
              </select>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                setCollapsed(new Set(containerIds(data, { maxItems })))
                refit()
              }}>
                {t('graph.collapseAll')}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                setCollapsed(new Set())
                refit()
              }}>
                {t('graph.expandAll')}
              </button>
              <button className="btn btn-sm btn-outline-secondary" title={t('graph.relayoutTitle')} onClick={() => {
                setNodes(graph.nodes)
                refit()
              }}>
                {t('graph.relayout')}
              </button>
              <button className="btn btn-sm btn-dark" onClick={() => downloadFlowAsPng(wrapper.current, getNodes(), 'json-graph.png')}>
                {t('graph.exportPng')}
              </button>
            </div>
          </Panel>

          <Panel position="bottom-center">
            {toast
              ? <div className="flow-toast">{toast}</div>
              : <div className="flow-legend">
                {t('graph.nodes', { count: graph.nodes.length })} · {t('graph.help')}
                {graph.truncated && <strong className="text-danger"> · {t('graph.truncated')}</strong>}
              </div>}
          </Panel>
        </ReactFlow>
      </div>
    </JsonGraphContext.Provider>
  )
}

const JsonGraph = (props) => (
  <ReactFlowProvider>
    <JsonGraphFlow {...props} />
  </ReactFlowProvider>
)

export default JsonGraph
