import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = ({ logged }) => {

  const logOut = () => {
    localStorage.clear()
    window.location.reload();
  }




  return (

    logged ?


      <div style={{ display: 'flex', justifyContent: 'space-between' }}>

        <div className='home-logo'>
          <h2>
            <Link to='/'>logo</Link>
          </h2>
        </div>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '750px', alignItems: 'center' }}
        >
          <Link className="text-decoration-none" to='/'>HOME</Link>
          <Link className="text-decoration-none" to='/excel-to-json'>Excel to json</Link>
          <Link className="text-decoration-none" to='/json-structure'>json structure</Link>
          <Link className="text-decoration-none" to='/test-api'>Test API</Link>
          <Link className="text-decoration-none" to='/support'>Contact us</Link>
        </nav>

        <button
          onClick={logOut}
        >log out</button>

      </div>


      :

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>

        <div className='home-logo'>
          <h2>
            <Link to='/'>logo</Link>
          </h2>
        </div>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '750px', alignItems: 'center' }}
        >
          <Link to='/'>HOME</Link>
          <Link to='/excel-to-json'>Excel to json</Link>
          <Link to='/test-api'>Test API</Link>
          <Link to='/support'>Contact us</Link>
        </nav>

        <button
          onClick={logOut}
        >log in</button>

      </div>
  )
}

export default Navbar