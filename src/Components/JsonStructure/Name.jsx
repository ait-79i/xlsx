import React, { useEffect, useState } from 'react'

const Name = ({ name, changeJsonKeys }) => {
  const [update, setupdate] = useState(false)
  const [columnName, setColumnName] = useState('')
  useEffect(() => {
    setColumnName(name)
  }, [name])
  const SaveColumnName = () => {
    changeJsonKeys(name, columnName)
    setupdate(false)
  }
  return (

    <div className='name-update'>
      {update
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
            <i className="fa-sharp fa-solid fa-check"></i>
          </button >
        </div >
        :

        <label style={{ marginLeft: '25px' }} onDoubleClick={() => setupdate(true)}>1 {columnName}</label>}
    </div>

  )
}

export default Name