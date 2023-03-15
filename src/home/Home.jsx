import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (

    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>

        <div className='home-logo'>
          <h2>
            <Link to='/'>logo</Link>
          </h2>
        </div>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '350px', alignItems: 'center' }}
        >
          <Link className="text-decoration-none" to='/'>HOME</Link>
          <Link className="text-decoration-none" to='/excel-to-json'>Excel to json</Link>
          <Link className="text-decoration-none" to='/support'>Contact us</Link>
        </nav>
        <nav
          style={{ display: 'flex', justifyContent: 'space-between', width: '100px', alignItems: 'center' }}
        >
          <Link to="/login?sign-in" >sign in</Link>

          <Link to="/login?sign-up">sign up</Link>
        </nav>
      </header>

      <section>

        <div style={{ fontSize: '300px' }}>home</div>
      </section>

    </div>
  )
}

export default Home