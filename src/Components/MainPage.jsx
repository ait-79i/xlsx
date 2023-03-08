import React, { useEffect, useState } from 'react';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import PopUp from './Popup/PopUp';
import DisplayTable from './tabaleData/DisplayTable';
import JsonStructure from './JsonStructure/JsonStructure';
import DisplayJson from './Popup/DisplayJson';
import JsonCols from './JsonStructure/JsonCols';
import './style.css'

function MainPage() {

  useEffect(() => {
    const unloadCallback = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", unloadCallback);
    return () => window.removeEventListener("beforeunload", unloadCallback);
  }, []);

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
  function changeKeysOfNestedObject(obj, oldKey, newKey) {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object") {
        newObj[key] = changeKeysOfNestedObject(value, oldKey, newKey);
      } else if (key === oldKey) {
        newObj[newKey] = value;
      } else {
        newObj[key] = value;
      }
    }
    // console.log(newObj);
    return newObj;
  }


  const changeJsonKeys = (oldName, newName) => {
    var newdt = []
    jsonFile.map((obj) =>
      newdt = [...newdt, changeKeysOfNestedObject(obj, oldName, newName)]
    );
    setJsonFile([...newdt])
  }


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
  // const sendRequest = async () => {
  //   await axios.post('http://localhost:5000/api/xlsxdata', jsonFile).then((res) => {
  //     console.log(res.data);
  //   }).catch((err) => {
  //     console.log(err);
  //   })
  // }

  const downloadFile = () => {
    const jsonStr = JSON.stringify(jsonFile);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const downloadLink = document.createElement('a');
    downloadLink.download = 'data.json';
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.click();
  };


  const handleFileUpload = event => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);
      setJsonFile(data)
    };
    reader.readAsText(file);
  };



  return (
    <div>
      {/* ----------------------- PopUp  Component------------- */}

      <PopUp
        data={jsonFile[0]}
        open={openModal}
        onClose={() => setOpenModal(false)} />
      <button
        onClick={() => {
          localStorage.clear()
          window.location.reload();
        }}
      >log out</button>

      {/* ----------------------- Drag And Drop Zone------------- */}
      <DragAndDrop setData={setData} />



      <div>
        {data.length > 0
          &&
          <div>
            <DisplayTable
              data={data}
              culomns={xlsxculomns}
              changeJsonKeys={changeJsonKeys}
            />
            <div className='' style={{ display: 'flex' }} >

              <DisplayJson data={jsonFile[0]} />


              <div>
                <div className='wrapper'>
                  <div >
                    {/*// todo */}
                    <select id="select"></select>
                    <input type="text"
                      value={key}
                      onChange={(e) => { setkey(e.target.value) }} placeholder=' Give a key to these values ...' />
                    <button onClick={generateJsonFile} >Generate</button>


                  </div>


                  {error.length !== 0 && <div className='error'>{error.join('\n')}</div>}

                  {/* //--------------JSON structure ----------------- */}

                  {culomns.map((key, index) =>
                    <div className='holder' key={index}>

                      <JsonCols
                        key={index}
                        name={key}
                        changeJsonKeys={changeJsonKeys}
                        handleCheckboxes={handleCheckboxes}
                      />
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
                            changeJsonKeys={changeJsonKeys}
                          />}
                      </div>
                    </div>

                  )}

                  {/* //--------------End JSON structure ----------------- */}

                </div>
                <div className='json-btns'>
                  <input type="file" onChange={handleFileUpload} />
                  <button onClick={downloadFile}>Download JSON</button>

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