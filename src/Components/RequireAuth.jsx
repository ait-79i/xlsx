import { useEffect } from "react";
import { useJwt } from "react-jwt";
import { Navigate, Outlet, useLocation } from "react-router-dom"
import axios from "../api/axios";

const RequireAuth = () => {

  useEffect(() => {
    validateToken()
  }, []);

  const { isExpired } = useJwt(localStorage.getItem("token"));


  const validateToken = () => {
    const token = localStorage.getItem("token");
    axios
      .get("/isUserAuth", {
        headers: { "x-access-token": token },
      }).then((response) => {
        console.log('res', response.data?.auth);
        if (response.data?.auth !== true) {
          localStorage.clear()
          window.location.href = '/login'
        }

      })
  };



  if (isExpired) {
    localStorage.clear();
    window.location.href = '/login'
  }

  const location = useLocation();
  const useAuth = () => {
    const token = localStorage.getItem("token");
    if (!token || token === undefined) {
      return false;
    } else {
      return true;
    }
  };

  const logged = useAuth();
  return (
    logged ? <><button onClick={() => validateToken()}>click me</button><Outlet /></> : <Navigate to='/login' state={{ from: location }} replace />
  )
}

export default RequireAuth

