import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Components from './LoginStyleComponents';
import axios from "axios";
import { API_URL } from "../../config";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../LanguageSwitcher";


function Login() {
  const { t } = useTranslation();


  // just for sign in and sign up ghost

  const [signIn, setSignIn] = useState(true);

  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const signInParam = searchParams.get('sign-in');
    const signUpParam = searchParams.get('sign-up');

    if (signInParam === '') {
      setSignIn(true)
    } else if (signUpParam === '') {
      setSignIn(false)
    } else {
      setSignIn(true)
    }
  }, [])



  const [username, setusername] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userpwd, setUserPwd] = useState('')

  const navigate = useNavigate();



  const register = (e) => {
    e.preventDefault()

    if (userpwd !== confirmPassword) {
      setRegisterError(t('login.errors.passwordsMismatch'))
      return
    }

    axios.post(`${API_URL}/register`, JSON.stringify({
      username: username,
      pwd: userpwd,
      email: userEmail
    }), {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    }).then(() => {
      // Account created: clear the form and show the sign in panel
      setusername('')
      setUserEmail('')
      setUserPwd('')
      setConfirmPassword('')
      setRegisterError('')
      setSignIn(true)
    }).catch((err) => {
      console.log(err)
      setRegisterError(err?.response?.data?.message || t('login.errors.registrationFailed'))
    })
  }




  const emailRef = useRef()
  const errRef = useRef()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [logginerror, setLogginerror] = useState('')

  useEffect(() => {
    emailRef.current.focus()
  }, [])

  useEffect(() => {
    setLogginerror('')
  }, [email, password])


  const login = (e) => {
    e.preventDefault()
    axios.post(`${API_URL}/login`, JSON.stringify({ email: email, pwd: password }), {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    }).then((response) => {
      if (!response.data.auth) {
        setLogginerror(response.data.message)
      } else {
        const accessToken = response?.data?.token
        localStorage.setItem("token", accessToken)
        navigate('/')
        setEmail('')
        setPassword('')

      }
    }).catch((err) => {
      console.log(err);
      if (!err?.response) {
        setLogginerror(t('login.errors.noServerResponse'))

      } else if (err?.response.status === 400) {
        setLogginerror(t('login.errors.missingCredentials'))

      } else if (err?.response.status === 401) {
        setLogginerror(t('login.errors.unauthorized'))

      } else {
        setLogginerror(t('login.errors.loginFailed'))

      }
      errRef.current.focus()
    })
  }


  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerError, setRegisterError] = useState('')

  return (
    <section style={{ marginTop: '50px' }} className="cc_flex flex-column gap-3">
      <LanguageSwitcher />
      <div >
        <Components.Container >
          <Components.SignUpContainer signinIn={signIn}>
            <Components.Form onSubmit={(e) => register(e)}>
              <Components.Title>{t('login.createAccount')}</Components.Title>
              <Components.Input
                type='text'
                value={username}
                id="username"
                placeholder={t('login.userName')}
                autoComplete="false"
                onChange={(e) => {
                  setusername(e.target.value)
                }} />
              <Components.Input
                type='email'
                value={userEmail}

                autoComplete="false"
                placeholder={t('login.email')}
                onChange={(e) => {
                  setUserEmail(e.target.value)
                }} />
              <Components.Input type='password'
                value={userpwd}

                placeholder={t('login.password')} onChange={(e) => {
                  setUserPwd(e.target.value)
                }} />
              <Components.Input type='password'
                value={confirmPassword}
                placeholder={t('login.confirmPassword')} onChange={(e) => {
                  setConfirmPassword(e.target.value)
                }} />
              <small aria-live="assertive" style={{ color: 'red' }}>{registerError}</small>
              <Components.Button >{t('login.signUp')}</Components.Button>
            </Components.Form>
          </Components.SignUpContainer>


          <Components.SignInContainer signinIn={signIn}>
            <Components.Form onSubmit={(e) => login(e)}>
              <Components.Title>{t('login.signIn')}</Components.Title>
              <Components.Input type='text'
                id='mail'
                placeholder={t('login.email')}
                value={email}
                ref={emailRef}
                required
                onChange={(e) => { setEmail(e.target.value) }}
              />


              <Components.Input
                type='password'
                id="pwd"
                placeholder={t('login.password')}
                value={password}
                required
                onChange={(e) => { setPassword(e.target.value) }}
              />
              <small ref={errRef} aria-live="assertive" style={{ color: 'red' }}>{logginerror}</small>
              {/* <Components.Anchor href='#'>Forgot your password?</Components.Anchor> */}
              <Components.Button >{t('login.signIn')}</Components.Button>
            </Components.Form>
          </Components.SignInContainer>


          {/* top */}


          <Components.OverlayContainer signinIn={signIn}>
            <Components.Overlay signinIn={signIn}>

              <Components.LeftOverlayPanel signinIn={signIn}>
                <Components.Title>{t('login.welcomeTitle')} <i className="fa fa-duotone fa-heart"></i></Components.Title>
                <Components.Paragraph>
                  {t('login.welcomeText')}
                </Components.Paragraph>
                <Components.GhostButton
                  onClick={() => {
                    setSignIn(true)
                  }}>
                  {t('login.signIn')}
                </Components.GhostButton>
              </Components.LeftOverlayPanel>

              <Components.RightOverlayPanel signinIn={signIn}>
                <Components.Title>{t('login.helloTitle')}</Components.Title>
                <Components.Paragraph>
                  {t('login.helloText')}
                </Components.Paragraph>
                <Components.GhostButton onClick={() => {
                  setSignIn(false)
                }}>
                  {t('login.signUp')}
                </Components.GhostButton>
              </Components.RightOverlayPanel>

            </Components.Overlay>
          </Components.OverlayContainer>

        </Components.Container>
      </div>
    </section>
  )
}

export default Login;