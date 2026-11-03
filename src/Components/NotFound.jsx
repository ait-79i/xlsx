"use client";

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Mascot from './Mascot'
import LiveScene from './LiveScene'
import './not-found.css'

// Light cover with the sloth on the end side; on narrow screens the confused sloth takes over
const NotFound = () => {
  const { t } = useTranslation()
  return (
    <main className='nf'>
      <LiveScene count={18} stars={6} seed={5} />
      <div className='nf__body'>
        <Mascot pose='error' motion='wobble' className='nf__mascot' />
        <p className='nf__code' aria-hidden='true'>404</p>
        <h1 className='nf__title'>{t('notFound')}</h1>
        <Link className='nf__home' href='/'>{t('nav.home')}</Link>
      </div>
    </main>
  )
}

export default NotFound
