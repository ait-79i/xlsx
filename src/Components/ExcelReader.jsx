import React, { useState } from 'react';
import * as XLSX from 'xlsx';

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

function ExcelReader() {
  const [data, setData] = useState([]);
  const [key, setkey] = useState(null);
  const [selctedColons, setselctedColons] = useState([]);
  const [wrap, setWrap] = useState(false);

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



  // const handeleClick = (elm) => {
  //   setNewData([...newData, elm])
  // }

  const keys = Object.keys(data[0] === undefined ? [] : data[0])


  const handleChangeChk = (e) => {
    setselctedColons([...selctedColons, e.target.value])
  }

  const keyHandle = (e) => {
    setkey(e.target.value)
  }

  // genereate the json file 
  const generateJsonFile = () => {

    var arr = []

    for (const item of data) {
      var json = {}
      var obj = {}
      for (const elm of keys) {

        if (!selctedColons.includes(elm)) {
          json[elm] = item[elm]
        } else {
          obj[elm] = item[elm]
        }
      }
      json[key] = obj
      arr.push(json)
    }
    console.log(arr);
  }

  // change culomns value
  const changeCulomn = (e) => {

  }


  const sendRequest = () => {

    //     fetch('https://jsonplaceholder.typicode.com/posts', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     title: 'foo',
    //     body: 'bar',
    //     userId: 1,
    //   }),
    //   headers: {
    //     'Content-type': 'application/json; charset=UTF-8',
    //   },
    // })

  }


  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      <div>
        {data.length > 0
          &&
          <div>
            <table border='1'>
              <thead>
                <tr>
                  {keys.map((key, index) => <th key={index}>
                    <input id={index} type='text' value={key} onChange={(e) => changeCulomn(e)} /></th>)}

                </tr>
              </thead>
              <tbody>
                {
                  data.map((item, index) => (
                    <tr key={index}>

                      {keys.map((value, index) => <td key={index}>{item[value]}</td>)}

                    </tr>
                  ))
                }
              </tbody>
            </table>
            <button onClick={() => {
              setWrap(true)
            }}>
              wrap
            </button>
            <button onClick={generateJsonFile}>Generate</button>

            <button onClick={sendRequest}>Send Request</button>

          </div>
        }

      </div >

      {wrap &&
        <div>
          <input type="text" name="key" id="key" onChange={(e) => keyHandle(e)} />
          {keys.map((key, index) =>
            <div key={index}>

              <input type="checkbox" id={key} value={key} onChange={handleChangeChk} />
              <label htmlFor={key}>{key}</label>

            </div>)}


        </div>
      }
    </div>
  );
}

export default ExcelReader;