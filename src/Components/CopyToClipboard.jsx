"use client";

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CopyToClipboard = ({ data }) => {
  const { t } = useTranslation()
  const [copy, setCopy] = useState(true)
  return (
    <div style={{ display:"flex", justifyContent:"space-between"}}>
      <div > {t('clipboard.copyYourData')}</div>
      {copy ?
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data))
            setCopy(false)
            setTimeout(() => {
              setCopy(true)
            }, 3000);
          }}
        >
          <span>
          <ion-icon name="clipboard-outline"></ion-icon>
          </span>
          {t('common.copy')}
        </button>

        :
        <button >
          <span>
            <ion-icon name="checkmark-sharp"></ion-icon>
          </span>
          {t('common.copied')}
        </button>
      }
    </div>
  )
}

export default CopyToClipboard