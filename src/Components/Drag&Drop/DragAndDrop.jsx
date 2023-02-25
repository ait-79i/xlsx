import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import './style.css';


function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onload = (e) => {
      const bufferArray = e.target.result;
      const wb = XLSX.read(bufferArray, { type: "buffer" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      resolve(data);
    };

    fileReader.onerror = (error) => {
      reject(error);
    };
  });
}

const DragAndDrop = ({ setData }) => {

  const [error, seterror] = useState([])

  const inputRef = useRef();

  function handleFileUpload(e) {

    const file = e.target.files[0];

    // if (validateFile(file.name)) {

    readExcelFile(file)
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.log(error);
      });
    // }
  }

  const handleDragOver = (e) => {
    e.preventDefault();
  }

  const handleDrop = (e) => {
    e.preventDefault();

    readExcelFile(e.dataTransfer.files[0])
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.log(error);
      });

  }


  // const validateFile = (fname) => {

  //   var re = /(\.xlsx|\.xlsm|\.xlsb|\.xls|\.xlam)$/i;
  //   if (!re.exec(fname)) {
  //     seterror("File extension not supported!")
  //     return false;
  //   }
  //   return true;

  // }
  return (
    <div>
      <div className='dropzone'
        onDragOver={(e) => handleDragOver(e)}
        onDrop={(e) => handleDrop(e)}
      >
        <span className="text">
          Drag and Drop your excel file
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

      {error !== '' ? <small>{error}</small> : null}
    </div>
  )
}

export default DragAndDrop