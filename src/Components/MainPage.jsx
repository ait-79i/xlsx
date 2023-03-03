import axios from 'axios';
import React, { useEffect, useState } from 'react';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import PopUp from './Popup/PopUp';
import DisplayTable from './tabaleData/DisplayTable';
import JsonStructure from './JsonStructure/JsonStructure';
// import SelectComponent from './JsonStructure/SelectComponent';
import './style.css'
import DisplayJson from './Popup/DisplayJson';

function MainPage() {

  const [data, setData] = useState([]);
  const [error, setError] = useState([]);
  const xlsxculomns = Object.keys(data[0] === undefined ? [] : data[0]);
  const [jsonFile, setJsonFile] = useState([])
  const [culomns, setCulomns] = useState([])
  const [key, setkey] = useState('');
  const [selctedColumns, setselctedColumns] = useState([]);


  useEffect(() => {
    setCulomns(Object.keys(jsonFile[0] === undefined ? [] : jsonFile[0]))

  }, [jsonFile])



  useEffect(() => {
    setkey('')
    setCulomns(xlsxculomns)
    setJsonFile([...data])
    setselctedColumns([])
  }, [data])





  //checked boxes
  const handleCheckboxes = (e) => {
    const activeCheckbox = e.target.checked
    if (activeCheckbox === true) {
      setselctedColumns(oldselection => [...oldselection, e.target.value])
    } else {
      setselctedColumns(selctedColumns.filter(value => value !== e.target.value))
    }
  }


  const uncheckCheckboxes = () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(function (checkbox) {
      if (checkbox.checked) {
        checkbox.checked = false;
      }
    });
  }

  //-------------gnerate button ---------------//
  const generateJsonFile = () => {
    if (valide(key)) {
      const Json = newJson(jsonFile, culomns)
      setJsonFile(Json)
      setkey('')
      uncheckCheckboxes()
    }
  }

  // <----------- ^^ modify excel Cols ----------------->

  //! ---------- M1 ------------  
  const handleChangeColumns = (index, columnName) => {
    const columns_copy = [...culomns]
    columns_copy.splice(index, 1, columnName)
    setCulomns(columns_copy)
  }

  //* newJson genereate a new json file  with new cols 
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



  //!  ------------ M2 -----------


  // function updateNestedObjectKeys(keyMap) {
  //   var data_copy = []
  //   for (const obj of jsonFile) {
  //     Object.keys(obj).forEach((key) => {
  //       if (keyMap.hasOwnProperty(key)) {
  //         obj[keyMap[key]] = obj[key];
  //         delete obj[key];
  //       }
  //       if (typeof obj[key] === 'object') {
  //         updateNestedObjectKeys(obj[key], keyMap);
  //       }
  //     });
  //     data_copy = [...data_copy, obj]
  //   }
  //   setJsonFile(data_copy)
  // }




  // -------------- validatin --------------
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


  // ------------------ unstage keys  under test ---------------------

  //---------- remove key function ----------//
  var value = '';
  function deleteKey(obj, keyToDelete) {

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        if (prop === keyToDelete) {
          // console.log(obj[prop]);
          value = obj[prop]
          delete obj[prop];
        } else if (typeof obj[prop] === 'object') {
          deleteKey(obj[prop], keyToDelete);
        }
        if (JSON.stringify(obj[prop]) === '{}') {
          delete obj[prop];
        }
      }
    }

  }

  //-------------- generate a new json file ----------------//
  const updateJsonFile = (elm) => {
    const arr_copy = [...jsonFile]
    for (const obj of arr_copy) {
      // remove a spicify key
      deleteKey(obj, elm)
      //add The same key and its value to the top level of each Object
      obj[elm] = value;
    }
    setJsonFile(arr_copy)
    uncheckCheckboxes()
  }


  //------------ PopUp state---------
  const [openModal, setOpenModal] = useState(false);


  // <------------------ Send Data ------------------>
  const sendRequest = async () => {
    await axios.post('http://localhost:5000/api/xlsxdata', jsonFile).then((res) => {
      console.log(res.data);
    }).catch((err) => {
      console.log(err);
    })
  }



  // --------------------

  // const [options, setoptions] = useState([
  //   { key: 'name', value: "name" },
  //   { key: 'data', value: "data" },
  //   { key: 'school', value: "school" },
  //   { key: 'work', value: "work" }
  // ])

  // const [selectedOption, setSelectedOption] = useState("");


  return (
    <div>
      {/* ----------------------- PopUp  Component------------- */}

      <PopUp
        data={jsonFile[0]}
        open={openModal}
        onClose={() => setOpenModal(false)} />


      <DragAndDrop setData={setData} />

      <div>
        {data.length > 0
          &&
          <div>
            <div className='' style={{ display: 'flex' }}>

              <DisplayJson data={jsonFile[0]} />

              {/* <DisplayTable data={data} culomns={xlsxculomns} handleChangeColumns={handleChangeColumns} /> */}


              <div>
                <div className='wrapper'>
                  <div >
                    {/*// todo */}
                    {/* <div className="App">

                      <SelectComponent
                        options={options}
                        onChange={(item) => {
                          setkey(item)
                          setSelectedOption(item)
                          setoptions([...options, { key: key, value: key }])
                        }}
                        selectedKey={selectedOption}
                        placeholder={"type to search"}
                      />
                      <p>selected option: {key}</p>
                    </div> */}

                    <input
                      type="text"
                      value={key}
                      onChange={(e) => { setkey(e.target.value) }} placeholder=' Give a key to these values ...' />
                  </div>


                  {error.length !== 0 && <div className='error'>{error.join('\n')}</div>}

                  {/* //--------------Test----------------- */}

                  {culomns.map((key, index) =>
                    <div className='holder' key={index}>
                      <input
                        type="checkbox"
                        id={key}
                        value={key}
                        onChange={handleCheckboxes}
                      />
                      <label>{key}</label>
                      <div>
                        {
                          typeof jsonFile[0][key] === 'object'
                          &&
                          <JsonStructure
                            key={index}
                            name={key}
                            handleCheckboxes={handleCheckboxes}
                            data={jsonFile[0]}
                            updateJsonFile={updateJsonFile}
                            setselctedColumns={setselctedColumns}
                            selctedColumns={selctedColumns}
                          />}
                      </div>
                    </div>

                  )}


                </div>
                <div className='json-btns'>
                  <button onClick={generateJsonFile}>Generate</button>
                  <button onClick={() => {
                    setOpenModal(true)
                  }}>S</button>
                  <button
                    onClick={
                      () => {
                        // sendRequest

                        console.log(jsonFile);

                      }
                    }
                  >Send Data</button>
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