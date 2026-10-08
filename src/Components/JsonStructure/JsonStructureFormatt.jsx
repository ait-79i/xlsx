"use client";

import React, { useState } from 'react'
import { PreventReload } from '../CommanFunctions';
import JsonCols from './JsonCols';
import JsonStructure from './JsonStructure';
import { useTranslation } from 'react-i18next';

const JsonStructureFormatt = ({ culomns, setJsonFile, jsonFile, xlsxculomns, setpreventUpdateTableCols }) => {

  PreventReload()
  const { t } = useTranslation();


  const [error, setError] = useState([]);
  const [key, setkey] = useState('');
  const [selctedColumns, setselctedColumns] = useState([]);

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


  const generateJsonFile = () => {
    if (valide(key)) {
      const Json = newJson(jsonFile, culomns)
      setJsonFile(Json)
      setkey('')
      uncheckCheckboxes()
    }
    setpreventUpdateTableCols(true)
  }

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




  //-------------- generate a new json file ----------------//
  const updateJsonFile = (elm) => {
    // deep copy: deleteKey mutates nested objects, which must not touch the current state
    const arr_copy = JSON.parse(JSON.stringify(jsonFile))
    for (const obj of arr_copy) {
      // remove a spicify key
      value = undefined
      deleteKey(obj, elm)
      //add The same key and its value to the top level of each Object
      obj[elm] = value;
    }
    setJsonFile(arr_copy)
    uncheckCheckboxes()
  }


  const valide = (text) => {
    if ((text.trim() === '' && selctedColumns.length !== 0)
      || (!isNaN(text) && selctedColumns.length !== 0)
      || (selctedColumns.length === 0 && text.trim() !== '')
    ) {


      var errs = []

      if (text.trim() === '') {
        errs = [...errs, `- ${t('structure.errors.emptyKey')}`]
      }
      if (!isNaN(text)) {
        errs = [...errs, `- ${t('structure.errors.keyMustBeText')}`]
      }
      if (selctedColumns.length === 0) {
        errs = [...errs, `- ${t('structure.errors.selectColumn')}`]
      }

      setError([...errs])
      return false
    } else {
      setError('')
      return true
    }
  }



  return (


    <div >



      <div className="input-group">
        <input
          type="text"
          className="form-control h-50"
          value={key}
          onChange={(e) => { setkey(e.target.value) }}
          placeholder={t('structure.keyPlaceholder')} />
        <button className="btn h-50" type="button" onClick={generateJsonFile}>{t('structure.generate')}</button>
      </div>

      {error.length !== 0 && <div className='error'><pre>{error.join('\n')}</pre></div>}

      {/* //--------------JSON structure ----------------- */}

      {culomns.map((key, index) =>
        <div className='holder' key={index}>

          <JsonCols
            key={index}
            name={key}
            data={jsonFile}
            setJsonFile={setJsonFile}
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
                setJsonFile={setJsonFile}
                jsonFile={jsonFile}

              />}
          </div>
        </div>

      )}

      {/* //--------------End JSON structure ----------------- */}

    </div >
  )
}

export default JsonStructureFormatt