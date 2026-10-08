"use client";

import React, { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, baseLanguage } from '../i18n'
import './LanguageSwitcher.css'

const GlobeIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2.75 10h14.5M10 2.75c2 2.1 2.9 4.5 2.9 7.25S12 15.15 10 17.25M10 2.75C8 4.85 7.1 7.25 7.1 10s.9 5.15 2.9 7.25"
      fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// Button + listbox following the WAI-ARIA "select-only combobox" keyboard model
const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  const id = useId()
  const current = baseLanguage(i18n.resolvedLanguage)
  const currentIndex = Math.max(0, LANGUAGES.findIndex((l) => l.code === current))

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(currentIndex)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)

  const openMenu = (index = currentIndex) => {
    setActive(index)
    setOpen(true)
  }

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  const choose = (index) => {
    i18n.changeLanguage(LANGUAGES[index].code)
    close()
  }

  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const onButtonKeyDown = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openMenu(e.key === 'ArrowUp' ? LANGUAGES.length - 1 : currentIndex)
    }
  }

  const onListKeyDown = (e) => {
    const last = LANGUAGES.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => (i === last ? 0 : i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => (i === 0 ? last : i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        close(false)
        break
      default: {
        // jump to the language starting with the typed letter
        const index = LANGUAGES.findIndex((l) => l.label.toLowerCase().startsWith(e.key.toLowerCase()))
        if (index !== -1) setActive(index)
      }
    }
  }

  const currentLanguage = LANGUAGES[currentIndex]

  return (
    <div className="lang-switch" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="lang-switch__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${t('language')}: ${currentLanguage.label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onButtonKeyDown}
      >
        <GlobeIcon />
        <span className="lang-switch__label" lang={currentLanguage.code}>{currentLanguage.label}</span>
        <span className="lang-switch__code" aria-hidden="true">{currentLanguage.code}</span>
        <svg className="lang-switch__chevron" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M5.5 8l4.5 4.5L14.5 8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        hidden={!open}
        aria-label={t('language')}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        className="lang-switch__menu"
        onKeyDown={onListKeyDown}
      >
        {LANGUAGES.map((l, index) => (
          <li
            key={l.code}
            id={`${id}-opt-${index}`}
            role="option"
            aria-selected={index === currentIndex}
            lang={l.code}
            dir={l.dir}
            className={`lang-switch__option${index === active ? ' is-active' : ''}`}
            onPointerEnter={() => setActive(index)}
            onClick={() => choose(index)}
          >
            <span className="lang-switch__option-code" aria-hidden="true">{l.code}</span>
            <span className="lang-switch__option-label">{l.label}</span>
            <span className="lang-switch__check">{index === currentIndex && <CheckIcon />}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LanguageSwitcher
