"use client";

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import './Navbar.css'

// Header for public pages (support, not found) when nobody is signed in
const PublicHeader = () => {
  const { t } = useTranslation()
  return (
    <header className='app-nav'>
      <Link href='/' className='app-nav__logo'>{t('nav.logo')}</Link>
      <nav className='app-nav__links' aria-label={t('nav.home')}>
        <Link href='/'>{t('nav.home')}</Link>
        <Link href='/login?sign-in'>{t('nav.signIn')}</Link>
      </nav>
      <div className='app-nav__account'>
        <LanguageSwitcher />
      </div>
    </header>
  )
}

export default PublicHeader
