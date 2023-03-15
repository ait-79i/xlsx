import React, { useEffect, useState } from 'react'
import { changeJsonKeys } from '../CommanFunctions'

const Name = ({ name, setJsonFile,
  jsonFile, updateJsonFile, setselctedColumns, selctedColumns }) => {
  const [update, setupdate] = useState(false)
  const [columnName, setColumnName] = useState('')
  useEffect(() => {
    setColumnName(name)
  }, [name])
  
  const SaveColumnName = () => {
    const newData = changeJsonKeys(jsonFile, name, columnName)
    setJsonFile(newData)
    setupdate(false)
  }
  return (

    update
      ?
      <div
        style={{ marginLeft: '25px' }}
      >
        < input className='enter-col-name'
          type='text'
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)}
          onMouseLeave={() => SaveColumnName()}
        />
      </div >
      :
      <div className='holder' onDoubleClick={() => setupdate(true)}>
        <label style={{ marginLeft: '25px' }} htmlFor={name}>{columnName}</label>
        <button
          title={`remove ${name} from here `}
          className='btn-x'
          onClick={
            () => {
              updateJsonFile(name)
              setselctedColumns([...selctedColumns.filter(value => value !== name)])
            }
          }
        >
          <ion-icon
            title={`remove ${columnName} from here `}
            name="arrow-undo-outline"></ion-icon>
        </button>
      </div>
  )
}

export default Name