import axios from 'axios';
import React, { useEffect, useState } from 'react';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import DisplayJson from './Popup/DisplayJson';
import DisplayTable from './tabaleData/DisplayTable';

function MainPage() {

  const [data, setData] = useState([]);
  const [error, setError] = useState([]);
  const xlsxculomns = Object.keys(data[0] === undefined ? [] : data[0]);
  const [jsonFile, setJsonFile] = useState([])


  useEffect(() => {
    setCulomns(Object.keys(jsonFile[0] === undefined ? [] : jsonFile[0]))

  }, [jsonFile])


  useEffect(() => {
    setkey('')
    setCulomns(xlsxculomns)
    setJsonFile([...data])
    setjsondisplay(false)
    setselctedColumns([])
  }, [data])



  const [culomns, setCulomns] = useState([])
  const [key, setkey] = useState('');
  const [selctedColumns, setselctedColumns] = useState([]);
  const [jsondisplay, setjsondisplay] = useState(false)



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
      const Json = newJson(jsonFile, culomns)
      setJsonFile(Json)
      setjsondisplay(true)
      setkey('')
      uncheckCheckboxes()
    }


  }

  //* newJson genereate a new json file  from a
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
    await axios.post('http://localhost:5000/api/xlsxdata', jsonFile).then((res) => {
      console.log(res.data);
    }).catch((err) => {
      console.log(err);
    })
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


  const updateJsonFile = (name, elm) => {
    const arr_copy = [...jsonFile]
    for (const item of arr_copy) {
      item[elm] = item[name][elm];
      delete item[name][elm];
      if (JSON.stringify(item[name]) === '{}') {
        delete item[name];
      }
    }
    setJsonFile(arr_copy)
    uncheckCheckboxes()
  }


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
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => { setkey(e.target.value) }} placeholder=' Give a key to these values ...' />
                  {error.length !== 0 && <div className='error'>{error.join('\n')}</div>}
                  {culomns.map((key, index) =>
                    typeof jsonFile[0][key] === 'object'
                      ? <div className='holder' key={index}>

                        <input
                          type="checkbox"
                          id={key}
                          value={key}
                          onChange={handleCheckboxes}
                        />
                        <label htmlFor={key} >{key}</label>
                        <div>
                          {
                            [...Object.keys(jsonFile[0][key])].map((el, i) =>
                              <div key={i} style={{ marginLeft: '40px' }}>
                                <span>{el}</span>
                                <button
                                  onClick={
                                    () => {
                                      updateJsonFile(key, el)
                                      setselctedColumns([...selctedColumns.filter(value => value !== el)])
                                    }
                                  }
                                >X</button>
                              </div>
                            )
                          }
                        </div>
                      </div>
                      :

                      <div key={index} className='holder'>
                        <input
                          type="checkbox"
                          id={key}
                          value={key}
                          onChange={handleCheckboxes}
                        />
                        <label htmlFor={key} >{key}</label>
                      </div>
                  )
                  }
                </div>
                <div className='json-btns'>
                  <button onClick={generateJsonFile}>Generate</button>
                  <button onClick={sendRequest}>Send Data</button>
                </div>
              </div>

            </div>

          </div>
        }
      </div >
    </div>
  );
}

export default MainPage;