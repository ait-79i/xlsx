"use client";

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { BrandMark } from './Mascot'
import './Navbar.css'

const LINKS = [
  ['/', 'nav.home'],
  ['/excel-to-json', 'nav.excelToJson'],
  ['/json-structure', 'nav.jsonStructure'],
  ['/test-api', 'nav.testApi'],
  ['/visualizer', 'nav.visualizer'],
  ['/support', 'nav.contactUs'],
]

const Navbar = ({ username }) => {
  const { t } = useTranslation()
  const pathname = usePathname()

  const logOut = async (e) => {
    e.preventDefault()
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    window.location.href = "/login"
  }

  return (
    <header className='app-nav'>
      <Link href='/' className='app-nav__logo'><BrandMark />{t('nav.logo')}</Link>

      <nav className='app-nav__links' aria-label={t('nav.home')}>
        {LINKS.map(([href, key]) => (
          <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}>{t(key)}</Link>
        ))}
      </nav>

      <div className='app-nav__account'>
        <LanguageSwitcher />
        {username && (
          <Link href='/account' className='app-nav__account-link' aria-current={pathname === '/account' ? 'page' : undefined}
            title={t('nav.account')}>
            <span className='app-nav__avatar' aria-hidden='true'>{username.trim().charAt(0).toUpperCase()}</span>
            <span className='app-nav__username'>{username}</span>
          </Link>
        )}
        <a href='/login' className='app-nav__logout' onClick={logOut}>{t('nav.logout')}</a>
      </div>
    </header>
  )
}

export default Navbar
