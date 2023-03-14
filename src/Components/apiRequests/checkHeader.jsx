
import { useState } from "react";
import { updateObjectInArray } from "../CommanFunctions";

const CheckHeader = ({ hedKey, hedvalue, i, heads, headers, setheads, setHeaders }) => {
  const [key, setKey] = useState(hedKey)
  const [value, setValue] = useState(hedvalue)

  const [updateKey, setUpdateKey] = useState(false);
  const [updateValue, setUpdateValue] = useState(false);

  const handleCheck = (e) => {
    const activeCheckbox = e.target.checked

    if (activeCheckbox === true) {
      const key = e.target.value
      heads.map((hed) => {
        if (Object.keys(hed)[0] === key) {
          var headersCopy = { ...headers }
          headersCopy[key] = hed[key]
          setHeaders(headersCopy)
        }
      })
    } else {
      const key = e.target.value
      const copy = { ...headers }
      delete copy[key]
      setHeaders(copy)
    }
  }

  const updateHeads = () => {

    if (key !== hedKey || value !== hedvalue) {

      const newHeads = updateObjectInArray(heads, i, key, value)
      setheads(newHeads)
      console.log(newHeads)
    }



  }

  return (

    <fieldset className="d-flex justify-content-center align-items-center" >

      <input type="checkbox"
        value={hedKey}
        onChange={(e) => handleCheck(e)}

      />

      {
        updateKey ?
          <input
            type="text"
            id='input'
            onChange={(e) => setKey(e.target.value)}
            onMouseLeave={() => {
              updateHeads()
              setUpdateKey(false)
            }}
            value={key}

          />
          :
          <div
            className="col"
            onClick={() => setUpdateKey(true)}
          >{key}</div>
      }


      {
        updateValue ?
          <input
            type="text"
            id='input'
            onChange={(e) => setValue(e.target.value)}
            onMouseLeave={() => {
              setUpdateValue(false)
              updateHeads()
            }}
            value={value} />
          :
          <div className="col"
            onClick={() => setUpdateValue(true)}
          >{value}</div>
      }
    </fieldset>
  )
}

export default CheckHeader;
