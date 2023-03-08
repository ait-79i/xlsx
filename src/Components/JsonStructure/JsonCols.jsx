import React, { useEffect, useState } from 'react'

const JsonCols = ({ name, handleCheckboxes, changeJsonKeys }) => {
  const [update, setupdate] = useState(false)
  const [columnName, setColumnName] = useState('')
  useEffect(() => {
    setColumnName(name)
  }, [name])

  const SaveColumnName = () => {
    console.log(name, columnName);
    changeJsonKeys(name, columnName)
    setupdate(false)
  }
  return (
    <div className='name-update'>
      <input
        id={name}
        type="checkbox"
        value={name}
        onChange={handleCheckboxes}
      />
      {update
        ?
        <div className='name-update'>
          <input className='enter-col-name'
            type='text'
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
          />

          <button className='save-col-name' onClick={() => SaveColumnName()} >
            <i className="fa-sharp fa-solid fa-check"></i>
          </button>
        </div>
        :
        <label htmlFor={name} onDoubleClick={() => setupdate(true)}>2{columnName}</label>
      }
    </div>
  )
}

export default JsonCols