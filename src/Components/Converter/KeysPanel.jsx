"use client";

import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretIcon, ConcatIcon, DownIcon, EyeIcon, OutIcon, PencilIcon, SplitIcon, UngroupIcon, UpIcon } from './icons'
import ConcatDialog from './ConcatDialog'
import { findNode, suggestConcatKey } from '../../utils/converter'

const RenameInput = ({ initial, onSave, onCancel, label }) => {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const ref = useRef(null)
  const id = useId()
  useEffect(() => { ref.current?.select() }, [])

  const save = () => {
    if (value === initial) return onCancel()
    const result = onSave(value)
    if (result) setError(result)
  }

  return (
    <span className="cv-rename">
      <input
        ref={ref}
        className="cv-input cv-input--key"
        value={value}
        dir="ltr"
        spellCheck="false"
        autoComplete="off"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={(e) => { setValue(e.target.value); setError('') }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        onBlur={() => (error ? onCancel() : save())}
      />
      {error && <span className="cv-field-error" id={`${id}-err`} role="alert">{error}</span>}
    </span>
  )
}

const IconButton = ({ label, onClick, disabled, children }) => (
  <button type="button" className="cv-icon-btn" title={label} aria-label={label} onClick={onClick} disabled={disabled}>
    {children}
  </button>
)

const KeyItem = ({ node, index, count, parent, path, ctx }) => {
  const { t } = useTranslation()
  const { selected, toggle, editing, setEditing, rename, move, moveOut, ungroup, setInclude, sourceInfo, folded, fold, editConcat, split } = ctx
  const isGroup = node.kind === 'group'
  const isConcat = node.kind === 'concat'
  const sep = isConcat ? (node.separator === '' ? ' + ' : ` ${node.separator.replace(/ /g, '␣')} `) : ''
  const out = !isGroup && !node.include
  const keyPath = [...path, node.key]
  const source = sourceInfo?.(node, keyPath)
  const isFolded = isGroup && folded.has(node.id)

  return (
    <li className={`cv-key${isGroup ? ' cv-key--group' : ''}${isConcat ? ' cv-key--concat' : ''}${out ? ' is-out' : ''}${selected.has(node.id) ? ' is-picked' : ''}`}>
      <div className="cv-key__row">
        {isGroup && (
          <button type="button" className="cv-icon-btn cv-key__fold" aria-expanded={!isFolded}
            aria-label={t(isFolded ? 'converter.keys.expand' : 'converter.keys.collapse', { key: node.key })}
            onClick={() => fold(node.id)}>
            <CaretIcon open={!isFolded} />
          </button>
        )}
        <input
          type="checkbox"
          className="cv-check"
          checked={selected.has(node.id)}
          onChange={() => toggle(node.id)}
          aria-label={t('converter.keys.select', { key: node.key })}
        />
        {editing === node.id
          ? <RenameInput
            initial={node.key}
            label={t('converter.keys.rename', { key: node.key })}
            onSave={(value) => rename(node.id, value)}
            onCancel={() => setEditing(null)}
          />
          : <button
            type="button"
            className="cv-key__name"
            dir="ltr"
            title={t('converter.keys.rename', { key: node.key })}
            onClick={() => setEditing(node.id)}
          >
            {node.key}
            {isGroup && <span className="cv-key__brace">{isFolded ? ` { ${node.children.length} }` : ' { }'}</span>}
          </button>}

        {isConcat && (
          <button type="button" className="cv-key__parts" dir="ltr" onClick={() => editConcat(node)}
            title={t('converter.concat.partsTitle', { parts: node.parts.map((p) => p.key).join(', '), separator: JSON.stringify(node.separator) })}>
            {node.parts.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <span className="cv-key__parts-sep">{sep}</span>}
                {p.key}
              </React.Fragment>
            ))}
          </button>
        )}

        {source?.label && (
          <span className={`cv-key__source${source.changed ? ' is-changed' : ''}`} title={source.title} dir="ltr">
            {source.label}
          </span>
        )}

        <span className="cv-key__tools">
          {!isGroup && (
            <IconButton
              label={node.include ? t('converter.keys.included') : t('converter.keys.excluded')}
              onClick={() => setInclude([node.id], !node.include)}
            >
              <EyeIcon off={!node.include} />
            </IconButton>
          )}
          <IconButton label={t('converter.keys.moveUp')} onClick={() => move(node.id, -1)} disabled={index === 0}><UpIcon /></IconButton>
          <IconButton label={t('converter.keys.moveDown')} onClick={() => move(node.id, 1)} disabled={index === count - 1}><DownIcon /></IconButton>
          {parent && (
            <IconButton label={t('converter.keys.moveOut', { group: parent.key })} onClick={() => moveOut(node.id)}><OutIcon /></IconButton>
          )}
          {isGroup && (
            <IconButton label={t('converter.keys.ungroup', { key: node.key })} onClick={() => ungroup(node.id)}><UngroupIcon /></IconButton>
          )}
          {isConcat && (
            <>
              <IconButton label={t('converter.concat.edit', { key: node.key })} onClick={() => editConcat(node)}><PencilIcon /></IconButton>
              <IconButton label={t('converter.concat.split', { key: node.key })} onClick={() => split(node.id)}><SplitIcon /></IconButton>
            </>
          )}
        </span>
      </div>

      {isGroup && !isFolded && (
        <ul className="cv-keys__list">
          {node.children.map((child, i) => (
            <KeyItem key={child.id} node={child} index={i} count={node.children.length} parent={node} path={keyPath} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * The structure of the output: rename, group, reorder and leave out keys.
 * sourceInfo(node, path) -> { label, title, changed } describes where a key comes from.
 */
const KeysPanel = ({ shape, sourceInfo, selected, setSelected, actions, title, help, toolbar, sample }) => {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(null)
  const [folded, setFolded] = useState(() => new Set())
  const fold = (nodeId) => setFolded((prev) => {
    const next = new Set(prev)
    next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
    return next
  })
  const [groupKey, setGroupKey] = useState('')
  const [groupError, setGroupError] = useState('')
  const [concatDraft, setConcatDraft] = useState(null)
  const id = useId()

  // the selected keys, in the order they appear in the tree
  const openConcat = () => {
    const ids = []
    const visit = (list) => list.forEach((n) => {
      if (selected.has(n.id)) ids.push(n.id)
      if (n.kind === 'group') visit(n.children)
    })
    visit(shape)
    const nodes = ids.map((nid) => findNode(shape, nid)?.node).filter(Boolean)
    if (nodes.length < 2) return setGroupError(t('converter.errors.concatTwo'))
    if (nodes.some((n) => n.kind !== 'field')) return setGroupError(t('converter.errors.concatFields'))
    setConcatDraft({
      mode: 'create',
      parts: nodes.map((n) => ({ id: n.id, key: n.key, source: n.source })),
      key: suggestConcatKey(nodes.map((n) => n.key)),
      separator: ' ',
      skipEmpty: true,
    })
  }

  const editConcat = (node) => setConcatDraft({
    mode: 'edit',
    nodeId: node.id,
    parts: node.parts.map((p) => ({ id: p.id, key: p.key, source: p.source })),
    key: node.key,
    separator: node.separator,
    skipEmpty: node.skipEmpty,
  })

  const submitConcat = (values) => {
    const error = concatDraft.mode === 'edit'
      ? actions.updateConcat(concatDraft.nodeId, values)
      : actions.concat(values.order, values)
    if (error) return error
    if (concatDraft.mode === 'create') setSelected(new Set())
    setConcatDraft(null)
    return null
  }

  useEffect(() => { setGroupError('') }, [selected, groupKey])

  const toggle = (nodeId) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId)
    return next
  })

  const rename = (nodeId, value) => {
    const error = actions.rename(nodeId, value)
    if (!error) setEditing(null)
    return error
  }

  const group = (e) => {
    e.preventDefault()
    const error = actions.group([...selected], groupKey)
    if (error) setGroupError(error)
    else { setGroupKey(''); setSelected(new Set()) }
  }

  const ctx = { selected, toggle, editing, setEditing, rename, sourceInfo, folded, fold, editConcat, ...actions }
  const count = selected.size

  return (
    <section className="cv-panel cv-keys" aria-labelledby={`${id}-title`}>
      <header className="cv-panel__head">
        <h2 className="cv-panel__title" id={`${id}-title`}>{title ?? t('converter.keys.title')}</h2>
        {toolbar}
      </header>

      <form className={`cv-groupbar${count > 0 ? ' is-active' : ''}`} onSubmit={group}>
        {count === 0
          ? <p className="cv-groupbar__hint">{help ?? t('converter.keys.help')}</p>
          : <>
            <div className="cv-groupbar__line">
              <strong>{t('converter.keys.selected', { count })}</strong>
              <button type="button" className="cv-link" onClick={() => actions.setInclude([...selected], true)}>{t('converter.keys.include')}</button>
              <button type="button" className="cv-link" onClick={() => actions.setInclude([...selected], false)}>{t('converter.keys.exclude')}</button>
              <button type="button" className="cv-link" onClick={() => setSelected(new Set())}>{t('converter.keys.clear')}</button>
            </div>
            <div className="cv-groupbar__line">
              <button type="button" className="cv-btn cv-btn--small" onClick={openConcat} disabled={count < 2}
                title={count < 2 ? t('converter.errors.concatTwo') : undefined}>
                <ConcatIcon />{t('converter.concat.open')}
              </button>
              <span className="cv-groupbar__or">{t('converter.keys.or')}</span>
            </div>
            <div className="cv-groupbar__line">
              <label htmlFor={`${id}-key`}>{t('converter.keys.groupUnder')}</label>
              <input
                id={`${id}-key`}
                className="cv-input cv-input--key"
                value={groupKey}
                dir="ltr"
                spellCheck="false"
                autoComplete="off"
                placeholder={t('converter.keys.groupPlaceholder')}
                aria-invalid={groupError ? true : undefined}
                aria-describedby={groupError ? `${id}-err` : undefined}
                onChange={(e) => setGroupKey(e.target.value)}
              />
              <button type="submit" className="cv-btn cv-btn--primary cv-btn--small">{t('converter.keys.group')}</button>
            </div>
            {groupError && <p className="cv-field-error" id={`${id}-err`} role="alert">{groupError}</p>}
          </>}
      </form>

      {concatDraft && (
        <ConcatDialog draft={concatDraft} sample={sample} onSubmit={submitConcat} onClose={() => setConcatDraft(null)} />
      )}

      <ul className="cv-keys__list cv-keys__root">
        {shape.map((node, i) => (
          <KeyItem key={node.id} node={node} index={i} count={shape.length} parent={null} path={[]} ctx={ctx} />
        ))}
      </ul>
    </section>
  )
}

export default KeysPanel
