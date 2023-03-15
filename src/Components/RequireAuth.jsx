import { useEffect } from "react";
import { useJwt } from "react-jwt";
import { Navigate, Outlet, useLocation } from "react-router-dom"
import axios from "axios";
import { useAuth } from "./CommanFunctions";
import Navbar from "./Navbar";


const RequireAuth = () => {

  useEffect(() => {
    validateToken()
  }, []);

  const { isExpired } = useJwt(localStorage.getItem("token"));

  const validateToken = () => {
    const token = localStorage.getItem("token");
    axios
      .get("http://localhost:5000/isUserAuth", {
        headers: { "x-access-token": token },
      }).then((response) => {
        if (response.data?.auth !== true || isExpired) {
          localStorage.clear()
          window.location.href = '/login'
        }
      })
  };

  const location = useLocation();


  const logged = useAuth();
  return (
    <>
      {logged ?
        <>
          <Navbar />
          <Outlet />
        </>
        :
        <Navigate to='/login' state={{ from: location }} replace />
      }
    </>
  )
}

export default RequireAuth

