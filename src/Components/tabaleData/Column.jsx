import React, { useEffect, useState } from 'react'

const Column = ({ index, name, changeJsonKeys }) => {


  const [columnName, setColumnName] = useState('')
  const [update, setupdate] = useState(false)


  useEffect(() => {
    setColumnName(name)
  }, [name])


  const SaveColumnName = () => {
    console.log(name, columnName);
    changeJsonKeys(name, columnName)
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

export default Column