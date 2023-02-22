import React, { useRef } from 'react';
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

  const inputRef = useRef();



  function handleFileUpload(e) {

    const file = e.target.files[0];
    readExcelFile(file)
      .then((data) => {
        setData(data);
      })
      .catch((error) => {
        console.log(error);
      });
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
  return (
    <div className='dropzone'
      onDragOver={(e) => handleDragOver(e)}
      onDrop={(e) => handleDrop(e)}
    >
      <h4>Drag and Drop your excel file</h4>
      <h4>Or</h4>
      <input
        type="file"
        onChange={handleFileUpload}
        hidden
        ref={inputRef}
      />
      <button
        onClick={() => inputRef.current.click()}
      >Select file</button>


    </div>
  )
}

export default DragAndDrop