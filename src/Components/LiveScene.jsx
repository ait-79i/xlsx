"use client";

import React, { useEffect, useRef } from 'react'
import './live-scene.css'

// Background life for the brand scenes: leaves, braces and sheet cells drifting down,
// stars twinkling on dark scenes, and a little depth that follows the pointer.
// Decorative only; it sits behind the content and ignores the pointer.

const LEAF = (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" fill="currentColor" />
    <path d="M5 19 15 9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const CELL = (
  <svg viewBox="0 0 28 20" width="28" height="20">
    <rect x="0.75" y="0.75" width="26.5" height="18.5" rx="2.5" fill="rgba(255,255,255,0.85)" stroke="currentColor" strokeWidth="1.5" />
    <path d="M0.75 6.5h26.5M10 6.5v12.75M19 6.5v12.75M0.75 12.75h26.5" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1.5" y="1.5" width="25" height="4.5" rx="1.5" fill="currentColor" opacity="0.55" />
  </svg>
)

const SPARK = (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="currentColor" />
  </svg>
)

const SHAPES = {
  leaf: LEAF,
  cell: CELL,
  spark: SPARK,
  brace: <span className="ls-brace">{'{ }'}</span>,
}

// how often each shape is drawn, per theme
const MIX = {
  light: ['leaf', 'leaf', 'leaf', 'cell', 'brace', 'spark'],
  dark: ['leaf', 'leaf', 'cell', 'brace', 'brace', 'spark'],
}

// Small deterministic generator so the server and the browser draw the same scene
const random = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const LiveScene = ({ theme = 'light', count = 14, stars = theme === 'dark' ? 10 : 0, seed = 7, className = '' }) => {
  const ref = useRef(null)
  const rnd = random(seed)
  const mix = MIX[theme]

  const particles = Array.from({ length: count }, (_, i) => {
    const kind = mix[Math.floor(rnd() * mix.length)]
    const depth = 0.55 + rnd() * 0.75 // further particles are smaller, slower and fainter
    return {
      kind,
      style: {
        '--x': `${(i / count) * 100 + rnd() * (100 / count)}%`,
        '--d': `${(32 + rnd() * 22) / depth}s`,
        '--delay': `${-rnd() * 60}s`,
        '--s': depth.toFixed(2),
        '--sway': `${10 + rnd() * 26}px`,
        '--sway-d': `${4.5 + rnd() * 3.5}s`,
        '--spin': `${(rnd() < 0.5 ? -1 : 1) * (90 + rnd() * 270)}deg`,
        '--o': (0.35 + depth * 0.45).toFixed(2),
        '--depth': depth.toFixed(2),
      },
    }
  })

  const twinkles = Array.from({ length: stars }, () => ({
    '--x': `${rnd() * 100}%`,
    '--y': `${rnd() * 100}%`,
    '--s': (0.35 + rnd() * 0.6).toFixed(2),
    '--d': `${2.5 + rnd() * 3}s`,
    '--delay': `${-rnd() * 5}s`,
  }))

  // the pointer gives the layer a little depth: near particles move more than far ones
  useEffect(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = (e) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect()
        el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const leave = () => { el.style.setProperty('--px', 0); el.style.setProperty('--py', 0) }
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div ref={ref} className={`ls ls--${theme} ${className}`.trim()} aria-hidden="true">
      {twinkles.map((style, i) => (
        <span key={`t${i}`} className="ls-star" style={style}>{SPARK}</span>
      ))}
      {particles.map(({ kind, style }, i) => (
        <span key={i} className="ls-p" style={style}>
          <span className="ls-p__depth">
            <span className={`ls-p__sway ls-p--${kind}`}>{SHAPES[kind]}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

export default LiveScene
