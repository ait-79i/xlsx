import { Link } from 'react-router-dom'
import { useAuth0 } from "@auth0/auth0-react";
import LoginButton from '../publicPage/LoginButton';
import LogoutButton from '../publicPage/LogoutButton';
const Navbar = () => {
  const { isLoading, error } = useAuth0();

  return (
    <>
      <header className="header">
        <div className='logo'>

        </div>

        <div className="navlink">

          <Link to="/">home</Link>

          <Link to="/">walo</Link>

          <Link to="/">walo</Link>

          <Link to="/">walo</Link>

          <Link to="/">walo</Link>

        </div>
        <div className='logout'>
          {error && <>Authentication Error</>}
          {!error && isLoading && <>Loading...</>}
          {!error && !isLoading && (
            <>
              <LoginButton />
              <br />
              <LogoutButton />


            </>)}
        </div>
      </header>
    </>
  )
}

export default Navbar