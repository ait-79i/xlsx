import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Components from './LoginStyleComponents';
import axios from "axios";


function Login() {


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

    axios.post('http://localhost:5000/register', JSON.stringify({
      username: username,
      pwd: userpwd,
      email: userEmail
    }), {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    }).then((res) => {
      console.log(res)

    }).catch((err) => console.log(err))
    navigate('/')
    setusername('')
    setUserEmail('')
    setUserPwd('')
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
    axios.post('http://localhost:5000/login', JSON.stringify({ email: email, pwd: password }), {
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
        setLogginerror("No server Response")

      } else if (err?.response.status === 400) {
        setLogginerror('Missing Email or Password')

      } else if (err?.response.status === 401) {
        setLogginerror('Unauthorazied')

      } else {
        setLogginerror('Login Failed')

      }
      errRef.current.focus()
    })
  }


  const [confirmPassword, setConfirmPassword] = useState('')

  return (
    <section style={{ marginTop: '50px' }} className="cc_flex">
      <div >
        <Components.Container >
          <Components.SignUpContainer signinIn={signIn}>
            <Components.Form onSubmit={(e) => register(e)}>
              <Components.Title>Create Account</Components.Title>
              <Components.Input
                type='text'
                value={username}
                id="username"
                placeholder='User Name'
                autoComplete="false"
                onChange={(e) => {
                  setusername(e.target.value)
                }} />
              <Components.Input
                type='email'
                value={userEmail}

                autoComplete="false"
                placeholder='Email'
                onChange={(e) => {
                  setUserEmail(e.target.value)
                }} />
              <Components.Input type='password'
                value={userpwd}

                placeholder='Password' onChange={(e) => {
                  setUserPwd(e.target.value)
                }} />
              <Components.Input type='password'
                value={confirmPassword}
                placeholder='Confirm Password' onChange={(e) => {
                  setConfirmPassword(e.target.value)
                }} />
              <Components.Button >Sign Up</Components.Button>
            </Components.Form>
          </Components.SignUpContainer>


          <Components.SignInContainer signinIn={signIn}>
            <Components.Form onSubmit={(e) => login(e)}>
              <Components.Title>Sign in</Components.Title>
              <Components.Input type='text'
                id='mail'
                placeholder='Email'
                value={email}
                ref={emailRef}
                required
                onChange={(e) => { setEmail(e.target.value) }}
              />


              <Components.Input
                id="pwd"
                placeholder='Password'
                value={password}
                required
                onChange={(e) => { setPassword(e.target.value) }}
              />
              <small ref={errRef} aria-live="assertive" style={{ color: 'red' }}>{logginerror}</small>
              {/* <Components.Anchor href='#'>Forgot your password?</Components.Anchor> */}
              <Components.Button >Sigin In</Components.Button>
            </Components.Form>
          </Components.SignInContainer>


          {/* top */}


          <Components.OverlayContainer signinIn={signIn}>
            <Components.Overlay signinIn={signIn}>

              <Components.LeftOverlayPanel signinIn={signIn}>
                <Components.Title>Welcome <i className="fa fa-duotone fa-heart"></i>!</Components.Title>
                <Components.Paragraph>
                  To keep connected with us please login with your personal info
                </Components.Paragraph>
                <Components.GhostButton
                  onClick={() => {
                    setSignIn(true)
                  }}>
                  Sign In
                </Components.GhostButton>
              </Components.LeftOverlayPanel>

              <Components.RightOverlayPanel signinIn={signIn}>
                <Components.Title>Hi, Dear!</Components.Title>
                <Components.Paragraph>
                  Enter Your personal details and start journey with us
                </Components.Paragraph>
                <Components.GhostButton onClick={() => {
                  setSignIn(false)
                }}>
                  Sigin Up
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