import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'


const SendButton = ({ data, setBodyRequestData }) => {
  const { t } = useTranslation()
  return (

    <Link to='/test-api' className='text-decoration-none text-black'
      onClick={() => setBodyRequestData(data)}
    >
      {t('actions.sendData')}
    </Link>
  )
}

export default SendButton