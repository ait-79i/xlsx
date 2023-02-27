import axios from 'axios';
import React, { useEffect, useState } from 'react';
import DisplayJson from './DisplayJSON/DisplayJson';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import DisplayTable from './tabaleData/DisplayTable';

function MainPage() {

  const [data, setData] = useState([]);
  const [error, setError] = useState([]);
  const xlsxculomns = Object.keys(data[0] === undefined ? [] : data[0]);
  const [jsonFile, setJsonFile] = useState([])

  useEffect(() => {
    setCulomns(Object.keys(jsonFile[0] === undefined ? [] : jsonFile[0]))

    // for (const item of wrapperKeys) {

    //   if (!Object.keys(jsonFile[0]).includes(item)) {
    //     console.log('includes', item);
    //     setwrapperKeys(wrapperKeys.filter(value => value !== item))
    //   }
    // }

  }, [jsonFile])


  useEffect(() => {
    setkey('')
    setCulomns(xlsxculomns)
    setJsonFile([...data])
    setjsondisplay(false)
    setselctedColumns([])
    setGeneratedCols([])
  }, [data])

  const [generatedCols, setGeneratedCols] = useState([])


  const [culomns, setCulomns] = useState([])
  const [key, setkey] = useState('');
  const [selctedColumns, setselctedColumns] = useState([]);
  const [jsondisplay, setjsondisplay] = useState(false)

  const [keyUpdate, setkeyUpdate] = useState('')


  //checked boxes
  const handleCheckboxes = (e) => {
    const activeCheckbox = e.target.checked

    if (activeCheckbox === true) {
      setselctedColumns(oldselection => [...oldselection, e.target.value])
    } else {
      setselctedColumns(selctedColumns.filter(value => value !== e.target.value))
    }
  }


  const handleChangeColumns = (index, columnName) => {
    const columns_copy = [...culomns]
    columns_copy.splice(index, 1, columnName)
    setCulomns(columns_copy)
  }

  const uncheckCheckboxes = () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (checkbox) {
      if (checkbox.checked) {
        checkbox.checked = false;
      }
    });

  }

  const generateJsonFile = () => {
    if (valide(key)) {
      setGeneratedCols([...new Set(selctedColumns)])
      const Json = newJson(jsonFile, culomns)
      setJsonFile(Json)
      setjsondisplay(true)
      setkey('')
      // uncheck checked checkboxes
      uncheckCheckboxes()
      const wrappkeys_copy = [...wrapperKeys, key]
      setwrapperKeys([...new Set(wrappkeys_copy)])
    }


  }

  //* newJson genereate the json file 
  const newJson = (data, culomns) => {

    var jsons_Arr = []

    for (const item of data) {
      var json = {}
      var obj = {}
      for (const elm of culomns) {

        if (!selctedColumns.includes(elm)) {
          item[elm] !== undefined
            ? json[elm] = item[elm]
            : json[elm] = item[xlsxculomns[culomns.indexOf(elm)]]

        } else {
          item[elm] !== undefined
            ? obj[elm] = item[elm]
            : obj[elm] = item[xlsxculomns[culomns.indexOf(elm)]]
        }
      }
      if (key.trim() !== '') json[key.trim()] = { ...json[key.trim()], ...obj }
      jsons_Arr.push(json)
    }
    return jsons_Arr;
  }



  const sendRequest = async () => {
    await axios.post('http://localhost:5000/api/xlsxdata', jsonFile)

  }


  const valide = (text) => {
    if ((text.trim() === '' && selctedColumns.length !== 0) || (!isNaN(text) && selctedColumns.length !== 0) || (selctedColumns.length === 0 && text.trim() !== '')) {
      var errs = []
      if (text.trim() === '' && selctedColumns.length !== 0) {
        errs = [...errs, "this field can't be empty."]
      }
      if (!isNaN(text) && selctedColumns.length !== 0) {
        errs = [...errs, 'this field must be a string.']
      }
      if (selctedColumns.length === 0 && text.trim() !== '') {
        errs = [...errs, "You must select at least one column."]
      }
      setError([...errs])
      return false
    } else {

      setError('')
      return true
    }


  }
  const [colsToUpdate, setColsToUpdate] = useState([])


  const updateJsonFile = (name, colstoupdate) => {

    const arr_copy = [...jsonFile]

    for (const item of jsonFile) {

      for (const elm of colstoupdate) {

        item[elm] = item[name][elm];
        delete item[name][elm];
      }
      if (JSON.stringify(item[name]) === '{}') {
        delete item[name];
      }
    }

    setJsonFile(arr_copy)
    setkeyUpdate('')
    uncheckCheckboxes()
  }

  const handleChoosenColsToUpdate = (e) => {
    const activeCheckbox = e.target.checked

    if (activeCheckbox === true) {
      setColsToUpdate(oldselection => [...oldselection, e.target.value])
    } else {
      setColsToUpdate(colsToUpdate.filter(value => value !== e.target.value))
    }

  }


  const [showUpdateDetails, setshowUpdateDetails] = useState(false);
  const toggleContent = () => {
    setshowUpdateDetails(!showUpdateDetails);
  }
  const [wrapperKeys, setwrapperKeys] = useState([])


  return (
    <div>

      <DragAndDrop setData={setData} />

      <div>
        {data.length > 0
          &&
          <div>
            {
              jsondisplay ? <DisplayJson data={jsonFile[0]} /> : null
            }
            <div className='' style={{ display: 'flex' }}>

              <DisplayTable data={data} culomns={xlsxculomns} handleChangeColumns={handleChangeColumns} />
              <div>
                <div className='wrapper'>
                  {wrapperKeys.length !== 0 &&
                    <select id="select" onChange={(e) => {
                      console.log(e.target.value === '');
                      setkey(e.target.value)
                    }}>
                      <option value="" >select a key</option>
                      {wrapperKeys.map((key, i) => <option key={i} value={key}
                      >{key}</option>)}
                    </select>}
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      setkey(e.target.value)
                    }}
                    placeholder=' Give a key to these values ...'
                  />
                  {error.length !== 0 &&
                    <div className='error'>{error.join('\n')}</div>
                  }
                  {culomns.map((key, index) =>
                    <div key={index} className='holder'>

                      <input
                        type="checkbox"
                        id={key}
                        value={key}
                        onChange={handleCheckboxes}
                      />
                      <label htmlFor={key} >{key}</label>

                    </div>)
                  }
                </div>
                <div className='json-btns'>
                  <button onClick={generateJsonFile}>Generate</button>
                  <input type="button" value={showUpdateDetails ? 'Hide' : 'Update'} onClick={toggleContent} />

                  <button onClick={sendRequest}>Send Data</button>
                </div>
                {showUpdateDetails && <>
                  <div className='wrapper'>
                    {wrapperKeys.length !== 0
                      ?
                      <select id="select" onChange={(e) => {
                        setkeyUpdate(e.target.value === '' ? wrapperKeys[0] : e.target.value)
                      }}>
                        <option value="" >select a key</option>
                        {wrapperKeys.map((key, i) => <option key={i} value={key}
                        >{key}</option>)}
                      </select>
                      :
                      'nothing to update'}


                    {generatedCols.map((key, index) =>
                      <div key={index} className='holder'>
                        <input
                          type="checkbox"
                          id={`${key} ${index}`}
                          value={key}
                          onChange={handleChoosenColsToUpdate}
                        />
                        <label htmlFor={`${key} ${index}`} >{key}</label>
                      </div>
                    )
                    }
                  </div>
                  <div className='json-btns'>
                    <button onClick={() => {
                      updateJsonFile(keyUpdate, colsToUpdate)
                      setGeneratedCols([...generatedCols.filter((x) => !colsToUpdate.includes(x))])
                      setColsToUpdate([])

                    }}>Revert</button>
                  </div>

                </>}


              </div>

            </div>

          </div>
        }

      </div >


    </div>
  );
}

export default MainPage;