"use client";

const TOKEN = /("(?:\.|[^"\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

/** JSON text -> highlighted spans (classes j-key, j-str, j-num, j-lit) */
export const highlightJson = (text) => {
  const parts = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<span key={m.index} className={m[2] ? 'j-key' : 'j-str'}>{m[1]}</span>)
      if (m[2]) parts.push(m[2])
    } else if (m[3]) {
      parts.push(<span key={m.index} className="j-lit">{m[3]}</span>)
    } else {
      parts.push(<span key={m.index} className="j-num">{m[4]}</span>)
    }
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return parts
}
