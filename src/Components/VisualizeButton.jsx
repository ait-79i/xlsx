import React from 'react'
import { Link } from 'react-router-dom'

const VisualizeButton = ({ data, setVisualData, label = 'Visualize' }) => {
  return (
    <Link to='/visualizer' className='text-decoration-none text-black'
      onClick={() => setVisualData(data)}
    >
      {label}
    </Link>
  )
}

export default VisualizeButton
