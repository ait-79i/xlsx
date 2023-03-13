import React, { useEffect, useState } from 'react'
import { changeJsonKeys } from '../CommanFunctions'

const Name = ({ name, setJsonFile,
  jsonFile }) => {
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
      // className='col-name-div'
      >
        < input className='enter-col-name'
          type='text'
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)} />

        < button className='save-col-name' id='save' onClick={() => SaveColumnName()} >
          <ion-icon name="checkmark-outline"></ion-icon>
        </button >
      </div >
      :

      <label style={{ marginLeft: '25px' }} onDoubleClick={() => setupdate(true)}>{columnName}</label>


  )
}

export default Name