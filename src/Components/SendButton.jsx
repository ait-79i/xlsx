"use client";

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'


const SendButton = ({ data, setBodyRequestData }) => {
  const { t } = useTranslation()
  return (

    <Link href='/test-api' className='text-decoration-none text-black'
      onClick={() => setBodyRequestData(data)}
    >
      {t('actions.sendData')}
    </Link>
  )
}

export default SendButton