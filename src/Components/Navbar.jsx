import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

const Navbar = () => {
  const { t } = useTranslation()

  const logOut = () => {
    localStorage.removeItem("token")
    window.location.reload();
  }
  return (

    <div className='d-flex justify-content-between align-items-center gap-3 px-2'>

      <div className='home-logo'>
        <h2>
          <Link to='/'>{t('nav.logo')}</Link>
        </h2>
      </div>

      <nav className='d-flex flex-wrap align-items-center gap-4'>
        <Link className="text-decoration-none" to='/'>{t('nav.home')}</Link>
        <Link className="text-decoration-none" to='/excel-to-json'>{t('nav.excelToJson')}</Link>
        <Link className="text-decoration-none" to='/json-structure'>{t('nav.jsonStructure')}</Link>
        <Link className="text-decoration-none" to='/test-api'>{t('nav.testApi')}</Link>
        <Link className="text-decoration-none" to='/visualizer'>{t('nav.visualizer')}</Link>
        <Link className="text-decoration-none" to='/support'>{t('nav.contactUs')}</Link>
      </nav>

      <div className='d-flex align-items-center gap-3'>
        <LanguageSwitcher />
        <Link to='/login' onClick={logOut}>{t('nav.logout')}</Link>
      </div>

    </div>
  )
}

export default Navbar
