import React, { useState } from 'react'
import Culomn from './Culomn'
import './style.css'
const DisplayTable = ({ data, culomns }) => {



  const updateColumnsName = (e, index) => {

    // if (e.target.id === index) {
    //   setupdate(true)
    // }
  }

  return (
    <div className='scroll-div'>
      <table className='content-table'>
        <thead>
          <tr>
            {culomns.map((name, index) =>
              <Culomn
                key={index}
                index={index}
                name={name}
                updateColumnsName={updateColumnsName}

              />
            )}

          </tr>
        </thead>
        <tbody>
          {
            data.map((item, index) => (
              <tr key={index}>

                {culomns.map((value, index) => <td key={index}>{item[value]}</td>)}

              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

export default DisplayTable