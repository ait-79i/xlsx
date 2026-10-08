"use client";

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const NotFound = () => {
  const { t } = useTranslation()
  return (
    <div className='px-2'>
      <h1>{t('notFound')}</h1>
      <Link href='/'>{t('nav.home')}</Link>
    </div>
  )
}

export default NotFound
