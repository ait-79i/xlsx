import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import * as Components from './LoginStyleComponents';

function Login({ setLogged, setUsernm }) {

  const redirect = useNavigate();
  const [signIn, setSignIn] = useState(true);


  // #region //! create Local Storage
  // const createLocalStorage = () => {
  //   localStorage.setItem("login", 0);
  //   localStorage.setItem("admin", 0);
  //   localStorage.setItem("username", null);

  // }
  // #endregion


  // #region //!Get Log in inputs values

  const [user, setUserData] = useState({
    email: '', password: ''
  });

  const SignInhandler = (e) => {
    switch (e.target.id) {
      case "mail":
        setUserData({ ...user, email: e.target.value });
        break;
      case "password":
        setUserData({ ...user, password: e.target.value })
        break;
      default:
        break;
    }
  }

  // #endregion


  // #region //todo Validation

  const [LogError, setLogError] = useState(false)

  const validate = () => {

  }
  // #endregion


  // #region //! Modify local storage Information with  saveToLocalStorage function

  // const saveToLocalStorage = (customer) => {

  //   // //* for login
  //   localStorage.setItem("login", 1)
  //   //! Change Login Value in App State 
  //   setLogged(localStorage.getItem("login"))


  //   localStorage.setItem("admin", customer.admin)
  //   setAdmin(parseFloat(localStorage.getItem("admin")))


  //   localStorage.setItem("username", customer.username)
  //   setUsernm(localStorage.getItem("username"))
  // }
  // #endregion


  // #region //! Check Existanse 
  // const chekExistance = (user) => {

  //   const customer = Customers.find((item) => item.email === user.email && item.pawd === user.password)

  //   if (customer) {

  //     saveToLocalStorage(customer)
  //     setUsernm(localStorage.getItem("username"))

  //     redirect("/")
  //   } else {
  //     redirect("/")
  //     setLogError(true)
  //   }

  // }
  // #endregion


  // #region //!Get Sign Up inputs values
  const [data, setdata] = useState({ username: "", email: '', pawd: '' })

  const SignUphandler = (e) => {
    switch (e.target.id) {
      case "name":
        setdata({ ...data, username: e.target.value });
        break;
      case "email":
        setdata({ ...data, email: e.target.value })
        break;
      case "pwd":
        setdata({ ...data, pawd: e.target.value })
        break;
      default:
        break;
    }
  }

  // #endregion


  // #region //! Add a new user to data base

  const AddCustomer = async (newUserData) => {
    await fetch('http://localhost:3000/api/custommer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(newUserData)
    })

    setLogged(true)

    redirect("/")

    setUsernm(newUserData.username)

    // setCustomers("rerender useEffect")
  }
  // #endregion


  return (

    <div className="cc_flex">
      <div >
        <Components.Container >
          <Components.SignUpContainer signinIn={signIn}>
            <Components.Form onSubmit={(e) => {
              // createLocalStorage()
              // e.preventDefault();
              // AddCustomer(data)

              // saveToLocalStorage({ admin: 0, username: data.username })

            }}>
              <Components.Title>Create Account</Components.Title>
              <Components.Input type='text' id="name" placeholder='User Name' onChange={(e) => {
                SignUphandler(e)
              }} />
              <Components.Input type='email' id="email" placeholder='Email' onChange={(e) => {
                SignUphandler(e)
              }} />
              <Components.Input type='password' id="pwd" placeholder='Password' onChange={(e) => {
                SignUphandler(e)
              }} />
              <Components.Button >Sign Up</Components.Button>
            </Components.Form>
          </Components.SignUpContainer>

          <Components.SignInContainer signinIn={signIn}>
            <Components.Form
              onSubmit={(e) => {
                // e.preventDefault()
                // createLocalStorage()
                // chekExistance(user)
              }}
            >
              <Components.Title>Sign in</Components.Title>
              <Components.Input type='text' id='mail' placeholder='Email' onChange={(e) => {
                SignInhandler(e)
              }} />


              <Components.Input id="password" placeholder='Password' onChange={(e) => {
                SignInhandler(e)
              }} />
              {LogError ? <span style={{ color: "red", fontSize: "10px" }}>Account Not Found</span> : null}
              <Components.Anchor href='#'>Forgot your password?</Components.Anchor>
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
      </div></div>
  )
}

export default Login;