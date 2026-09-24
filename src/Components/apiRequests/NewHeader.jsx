import React, { useState } from 'react'

const NewHeader = ({ setheads, heads }) => {
  const [newheaderKey, setNewheaderKey] = useState('')
  const [newheaderValue, setNewheaderValue] = useState('')

  const saveNewHeader = () => {
    if (newheaderKey !== '' && newheaderValue !== '') {
      var obj = {}
      obj[newheaderKey] = newheaderValue
      setheads([...heads, obj])
      setNewheaderKey('')
      setNewheaderValue('')
    }
  }

  return (
    <fieldset >
      <div className="d-flex">
        <input type="text"
          onBlur={saveNewHeader}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          placeholder='key '
          value={newheaderKey}
          onChange={(e) => { setNewheaderKey(e.target.value) }}
        />
        <input type="text"
          onBlur={saveNewHeader}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          placeholder='value'
          value={newheaderValue}
          onChange={(e) => { setNewheaderValue(e.target.value) }}
        />
      </div>

    </fieldset>
  )
}

export default NewHeader