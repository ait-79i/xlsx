"use client";

import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../Components/LanguageSwitcher'
import HomeDemo from './HomeDemo'
import './home.css'

const READS = ['.xlsx', '.xlsm', '.xlsb', '.xls', '.xlam', '.json', '.sql']
const WRITES = ['JSON', 'PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Mermaid', 'Excel', 'PNG']

const Brand = () => {
  const { t } = useTranslation()
  return (
    <Link href="/" className="home-brand">
      {t('nav.logo')}
    </Link>
  )
}

const logOut = async (e) => {
  e.preventDefault()
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.href = '/'
}

const Home = ({ signedIn = false }) => {
  const { t } = useTranslation()

  const steps = [
    { letter: 'A', href: '/excel-to-json', title: t('home.steps.convert.title'), text: t('home.steps.convert.text'), link: t('home.steps.convert.link') },
    { letter: 'B', href: '/json-structure', title: t('home.steps.reshape.title'), text: t('home.steps.reshape.text'), link: t('home.steps.reshape.link') },
    { letter: 'C', href: '/test-api', title: t('home.steps.send.title'), text: t('home.steps.send.text'), link: t('home.steps.send.link') },
    { letter: 'D', href: '/visualizer', title: t('home.steps.visualize.title'), text: t('home.steps.visualize.text'), link: t('home.steps.visualize.link') },
  ]

  return (
    <div className="home">
      <header className="home-header">
        <Brand />
        <nav className="home-header__nav" aria-label={t('nav.home')}>
          <Link href="/excel-to-json">{t('nav.excelToJson')}</Link>
          <Link href="/visualizer">{t('nav.visualizer')}</Link>
          <Link href="/support">{t('nav.contactUs')}</Link>
        </nav>
        <div className="home-header__account">
          <LanguageSwitcher />
          {signedIn ? (
            <a className="home-link" href="/login" onClick={logOut}>{t('nav.logout')}</a>
          ) : (
            <>
              <Link className="home-link" href="/login?sign-in">{t('nav.signIn')}</Link>
              <Link className="home-btn home-btn--small" href="/login?sign-up">{t('nav.signUp')}</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="home-title">
          <div className="hero__text">
            <h1 id="home-title" className="hero__title">{t('home.headline')}</h1>
            <p className="hero__lead">{t('home.subtitle')}</p>
            <div className="hero__actions">
              <Link className="home-btn" href="/excel-to-json">{t('home.cta')}</Link>
              <Link className="home-btn home-btn--ghost" href="/visualizer">{t('home.secondaryCta')}</Link>
            </div>
          </div>
          <HomeDemo />
        </section>

        <section className="steps" aria-labelledby="steps-title">
          <h2 id="steps-title" className="section-title">{t('home.steps.heading')}</h2>
          <ol className="steps__grid">
            {steps.map((step) => (
              <li key={step.letter} className="step">
                <span className="step__letter" aria-hidden="true">{step.letter}</span>
                <div className="step__body">
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__text">{step.text}</p>
                  <Link className="home-link step__link" href={step.href}>{step.link}</Link>
                </div>
              </li>
            ))}
          </ol>

          <dl className="formats">
            <div className="formats__row">
              <dt>{t('home.formats.reads')}</dt>
              <dd>{READS.map((f) => <code key={f} dir="ltr">{f}</code>)}</dd>
            </div>
            <div className="formats__row">
              <dt>{t('home.formats.writes')}</dt>
              <dd>{WRITES.map((f) => <span key={f} dir="ltr">{f}</span>)}</dd>
            </div>
          </dl>
        </section>

        <section className="closing" aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title" className="closing__title">{t('home.closing.title')}</h2>
            <p className="closing__text">{t('home.closing.text')}</p>
          </div>
          <div className="closing__actions">
            {signedIn ? (
              <Link className="home-btn home-btn--light" href="/excel-to-json">{t('home.cta')}</Link>
            ) : (
              <>
                <Link className="home-btn home-btn--light" href="/login?sign-up">{t('nav.signUp')}</Link>
                <Link className="home-link home-link--light" href="/login?sign-in">{t('nav.signIn')}</Link>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <Brand />
        <Link className="home-link" href="/support">{t('nav.contactUs')}</Link>
      </footer>
    </div>
  )
}

export default Home
