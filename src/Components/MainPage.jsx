import axios from 'axios';
import React, { useEffect, useState } from 'react';
import DisplayJson from './DisplayJSON/DisplayJson';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import DisplayTable from './tabaleData/DisplayTable';

function MainPage() {

  const [data, setData] = useState([]);
  const xlsxculomns = Object.keys(data[0] === undefined ? [] : data[0]);
  const [jsonFile, setJsonFile] = useState([])

  useEffect(() => {
    setCulomns(Object.keys(jsonFile[0] === undefined ? [] : jsonFile[0]))
  }, [jsonFile])


  useEffect(() => {
    setWrap(false)
    setkey('')
    setCulomns(xlsxculomns)
    setJsonFile([...data])
    setjsondisplay(false)

  }, [data])


  const [culomns, setCulomns] = useState([])
  const [key, setkey] = useState('');
  const [selctedColumns, setselctedColumns] = useState([]);
  const [wrap, setWrap] = useState(false);
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
    const Json = newJson(jsonFile, culomns)
    setJsonFile(Json)
    setjsondisplay(true)
    setkey('')

    // uncheck checked checkboxes
    uncheckCheckboxes()

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
      if (key !== '') json[key] = obj
      jsons_Arr.push(json)
    }
    return jsons_Arr;
  }

  const sendRequest = async () => {
    await axios.post('http://localhost:5000/api/xlsxdata', jsonFile)

  }


  return (
    <div>

      <DragAndDrop setData={setData} />

      <div>
        {data.length > 0
          &&
          <div>
            <div className='' style={{ display: 'flex' }}>

              <DisplayTable data={data} culomns={xlsxculomns} handleChangeColumns={handleChangeColumns} />

              <div>
                <div className="buttons">
                  <button onClick={() => {
                    setWrap(true)
                  }}>
                    wrap
                  </button>
                  {wrap &&
                    <div>

                      <div className='wrapper'>
                        <input
                          type="text"
                          value={key}
                          onChange={(e) => setkey(e.target.value)}
                          placeholder='give a key to these values ...'
                        />
                        {culomns.map((key, index) =>
                          <div key={index}>

                            <input
                              type="checkbox"
                              id={index}
                              value={key}
                              onChange={handleCheckboxes}
                            />
                            <span >{key}</span>

                          </div>)
                        }
                      </div>


                    </div>
                  }
                  <button onClick={generateJsonFile}>Generate</button>
                  <button onClick={sendRequest}>Send Data</button>

                </div>

              </div>
            </div>

            {
              jsondisplay ? <DisplayJson data={jsonFile[0]} /> : null
            }




          </div>
        }

      </div >


    </div>
  );
}

export default MainPage;