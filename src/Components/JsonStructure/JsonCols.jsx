import React, { useEffect, useState } from 'react'
import { changeJsonKeys } from '../CommanFunctions'

const JsonCols = ({ data, name, handleCheckboxes, setJsonFile }) => {
  const [update, setupdate] = useState(false)
  const [columnName, setColumnName] = useState('')
  useEffect(() => {
    setColumnName(name)
  }, [name])

  const SaveColumnName = () => {
    console.log(name, columnName);
    console.log(data);
    const newData = changeJsonKeys(data, name, columnName)
    setJsonFile(newData)
    setupdate(false)
  }
  return (
    <div className='name-update'>
      <input
        id={name}
        className="form-check-input mt-0"
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
        <label className=" ms-1 form-check-label" htmlFor={name} onDoubleClick={() => setupdate(true)}>{columnName}</label>
      }
    </div>
  )
}

export default JsonCols