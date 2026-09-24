import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../Components/LanguageSwitcher'

const Home = () => {
  const { t } = useTranslation()
  return (

    <div>
      <header className='d-flex justify-content-between align-items-center gap-3 px-2'>

        <div className='home-logo'>
          <h2>
            <Link to='/'>{t('nav.logo')}</Link>
          </h2>
        </div>
        <nav className='d-flex flex-wrap align-items-center gap-4'>
          <Link className="text-decoration-none" to='/'>{t('nav.home')}</Link>
          <Link className="text-decoration-none" to='/excel-to-json'>{t('nav.excelToJson')}</Link>
          <Link className="text-decoration-none" to='/support'>{t('nav.contactUs')}</Link>
        </nav>
        <nav className='d-flex align-items-center gap-3'>
          <LanguageSwitcher />
          <Link to="/login?sign-in" >{t('nav.signIn')}</Link>

          <Link to="/login?sign-up">{t('nav.signUp')}</Link>
        </nav>
      </header>

      <section className='container py-5 text-center'>
        <h1 className='display-4'>{t('home.title')}</h1>
        <p className='lead'>{t('home.subtitle')}</p>
        <Link className='btn btn-dark btn-lg' to='/excel-to-json'>{t('home.cta')}</Link>
      </section>

    </div>
  )
}

export default Home
