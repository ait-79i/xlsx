"use client";

import React, { useEffect, useState } from 'react'
import { changeJsonKeys } from '../CommanFunctions'
import { useTranslation } from 'react-i18next'

const Name = ({ name, setJsonFile,
  jsonFile, updateJsonFile, setselctedColumns, selctedColumns }) => {
  const { t } = useTranslation()
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
      >
        < input className='enter-col-name'
          type='text'
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)}
          autoFocus
          onBlur={() => SaveColumnName()}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
      </div >
      :
      <div className='holder' onDoubleClick={() => setupdate(true)}>
        <label style={{ marginLeft: '25px' }} htmlFor={name}>{columnName}</label>
        <button
          title={t('structure.moveToTop', { name })}
          className='btn-x'
          onClick={
            () => {
              updateJsonFile(name)
              setselctedColumns([...selctedColumns.filter(value => value !== name)])
            }
          }
        >
          <ion-icon
            title={t('structure.moveToTop', { name: columnName })}
            name="arrow-undo-outline"></ion-icon>
        </button>
      </div>
  )
}

export default Name