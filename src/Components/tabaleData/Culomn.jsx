import React, { useState } from 'react'


const Culomn = ({ index, name, handleChangeColumns }) => {

  const [update, setupdate] = useState(false)
  const [columnName, setColumnName] = useState(name)
  //!need to install packages
  // < FontAwesomeIcon icon = "fa-sharp fa-solid fa-check" />


  const SaveColumnName = () => {
    handleChangeColumns(index, columnName)
    setupdate(false)
  }

  return (
    <th onDoubleClick={() => { setupdate(true) }}>
      {update ?
        <div className='col-name-div'>
          <input className='enter-col-name'
            id={index}
            type='text'
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)} />
          <button className='save-col-name' onClick={() => SaveColumnName()}>
            <i className="fa-sharp fa-solid fa-check"></i>
          </button>
        </div>
        :
        <span id={index} >{columnName}</span>
      }

    </th>
  )
}

export default Culomn