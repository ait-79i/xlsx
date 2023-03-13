import React from 'react'
import { Link } from 'react-router-dom'


const SendButton = ({ data, setBodyRequestData }) => {
  return (

    <Link to='/test-api' className='text-decoration-none text-black'
      onClick={() => setBodyRequestData(data)}
    >
      Send data
    </Link>
  )
}

export default SendButton