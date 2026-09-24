import React from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, baseLanguage } from '../i18n'

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation()
  return (
    <select
      className="form-select form-select-sm w-auto"
      aria-label={t('language')}
      title={t('language')}
      value={baseLanguage(i18n.resolvedLanguage)}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
    >
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  )
}

export default LanguageSwitcher
