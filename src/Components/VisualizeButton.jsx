import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const VisualizeButton = ({ data, setVisualData, label }) => {
  const { t } = useTranslation()
  return (
    <Link to='/visualizer' className='text-decoration-none text-black'
      onClick={() => setVisualData(data)}
    >
      {label ?? t('actions.visualize')}
    </Link>
  )
}

export default VisualizeButton
