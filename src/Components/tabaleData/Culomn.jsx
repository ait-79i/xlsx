import React, { useEffect, useState } from 'react'

const Culomn = ({ index, name, handleChangeColumns }) => {


  const [columnName, setColumnName] = useState('')
  const [update, setupdate] = useState(false)


  useEffect(() => {
    setColumnName(name)
  }, [name])


  const SaveColumnName = () => {
    handleChangeColumns(index, columnName)
    setupdate(false)
  }
  //!need to install packages
  // < FontAwesomeIcon icon = "fa-sharp fa-solid fa-check" />



  return (
    <th onDoubleClick={() => { setupdate(true) }}>
      {update ?
        <div className='col-name-div'>
          <input className='enter-col-name'
            id={index}
            type='text'
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)} />
          <button className='save-col-name' id='save' onClick={() => SaveColumnName()} >
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