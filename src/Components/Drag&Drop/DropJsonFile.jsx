import React, { useRef, useState } from 'react'

import './style.css';
import { useTranslation } from 'react-i18next';
const DropJsonFile = ({ setData }) => {
  const { t } = useTranslation();

  const [err, seterror] = useState('')

  const inputRef = useRef();

  const parseJson = (text) => {
    try {
      setData(JSON.parse(text))
    } catch (e) {
      seterror(t('errors.invalidJson', { message: e.message }))
      setData([])
    }
  }

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const fileName = event.dataTransfer.files[0].name;
    const fileLength = event.dataTransfer.files.length;

    if (fileLength === 1) {
      const re = /(\.json)$/i;
      if (re.exec(fileName) !== null) {
        seterror("")
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = () => parseJson(reader.result)
      } else {
        seterror(t('dropzone.extensionNotSupported'))
        setData([])
      }

    } else {
      seterror(t('dropzone.onlyOneFile'));
      setData([])
    }

  }

  const handleDragOver = (event) => {
    event.preventDefault();
  }


  const handleFileUpload = event => {
    const file_name = event.target.files[0].name;
    const re = /(\.json)$/i;
    if (re.exec(file_name) !== null) {
      seterror('')
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => parseJson(reader.result);
      reader.readAsText(file);
    } else {
      seterror(t('dropzone.extensionNotSupported'))
      setData([])
    }
  };

  return (
    <div>
      <div className='dropzone'
        onDragOver={(event) => handleDragOver(event)}
        onDrop={(event) => handleDrop(event)}
      >
        <span className="text">
          {t('dropzone.dropJson')}
        </span>
        <span className="text or">{t('dropzone.or')}</span>
        <span className="text">{t('dropzone.selectFromComputer')}</span>
        <input
          type="file"
          onChange={handleFileUpload}
          hidden
          ref={inputRef}
        />
        <button className='file-btn'
          onClick={() => inputRef.current.click()}
        >{t('dropzone.selectFile')}</button>
      </div>
      <div className='d-flex justify-content-center'>

        {err !== '' ? <small className='text-danger h2 ' >{err}</small> : null}
      </div>
    </div>
  )
}

export default DropJsonFile