"use client";

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import './Navbar.css'

const LINKS = [
  ['/', 'nav.home'],
  ['/excel-to-json', 'nav.excelToJson'],
  ['/json-structure', 'nav.jsonStructure'],
  ['/test-api', 'nav.testApi'],
  ['/visualizer', 'nav.visualizer'],
  ['/support', 'nav.contactUs'],
]

const Navbar = () => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const logOut = async (e) => {
    e.preventDefault()
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    window.location.href = "/login"
  }

  return (
    <header className='app-nav'>
      <Link href='/' className='app-nav__logo'>{t('nav.logo')}</Link>

      <nav className='app-nav__links' aria-label={t('nav.home')}>
        {LINKS.map(([href, key]) => (
          <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{t(key)}</Link>
        ))}
      </nav>

      <div className='app-nav__account'>
        <LanguageSwitcher />
        <a href='/login' className='app-nav__logout' onClick={logOut}>{t('nav.logout')}</a>
      </div>
    </header>
  )
}

export default Navbar
