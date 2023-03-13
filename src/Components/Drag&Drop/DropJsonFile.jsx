import React, { useRef, useState } from 'react'

import './style.css';
const DropJsonFile = ({ setData }) => {

  const [err, seterror] = useState('')

  const inputRef = useRef();

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
        reader.onload = () => {
          const jsonData = JSON.parse(reader.result);
          setData(jsonData);
        }
      } else {
        seterror("File extension not supported!")
        setData([])
      }

    } else {
      seterror("You must choose only One File !!!");
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
      reader.onload = () => {
        const data = JSON.parse(reader.result);
        setData(data)
      };
      reader.readAsText(file);
    } else {
      seterror("File extension not supported!")
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
          Drag and Drop your JSON file
        </span>
        <span className="text or">Or</span>
        <span className="text">select a file to upload from your computer</span>
        <input
          type="file"
          onChange={handleFileUpload}
          hidden
          ref={inputRef}
        />
        <button className='file-btn'
          onClick={() => inputRef.current.click()}
        >Select file</button>
      </div>
      <div className='d-flex justify-content-center'>

        {err !== '' ? <small className='text-danger h2 ' >{err}</small> : null}
      </div>
    </div>
  )
}

export default DropJsonFile