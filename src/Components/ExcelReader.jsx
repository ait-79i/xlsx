import React, { useState } from 'react';
import DragAndDrop from './Drag&Drop/DragAndDrop';


function ExcelReader() {

  const [data, setData] = useState([]);
  const culomns = Object.keys(data[0] === undefined ? [] : data[0]);
  // const [culomns, setculomns] = useState(['culomn1', 'culomn2', 'culomn3', 'culomn4',])

  //todo make table culomns updateable

  // const keys = Object.keys(data[0] === undefined ? [] : data[0]);
  // const [culomns, setculomns] = useState([...keys])
  // console.log('keys : ', keys);
  // console.log('culomns : ', culomns);

  // console.log(data);
  const [key, setkey] = useState(null);
  const [selctedColons, setselctedColons] = useState([]);
  const [wrap, setWrap] = useState(false);
  const [nombreWrrap, setnombreWrrap] = useState(1);



  //checked boxes
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
      for (const elm of culomns) {

        if (!selctedColons.includes(elm)) {
          json[elm] = item[elm]
        } else {
          obj[elm] = item[elm]
        }
      }
      if (key !== null) json[key] = obj
      arr.push(json)
    }
    console.log(arr);
  }

  // change culomns value
  const updateCulomns = (e) => {

    // setculomns([...culomns, culomns[e.target.id] = e.target.value])
  }


  const sendRequest = () => {


  }


  const items = [];
  for (let i = 0; i < nombreWrrap; i++) {
    items.push(<div key={i} className='wrapper'>
      <input type="text" name="key" id="key" onChange={(e) => keyHandle(e)} />
      {culomns.map((key, index) =>
        <div key={index}>

          <input type="checkbox" id={key} value={key} onChange={handleChangeChk} />
          <label htmlFor={key}>{key}</label>

        </div>)}
    </div>);
  }


  return (
    <div>
      <DragAndDrop setData={setData} />

      <div>
        {data.length > 0
          &&
          <div>
            <table border='1'>
              <thead>
                <tr>
                  {culomns.map((key, index) => <th key={index}>
                    <input id={index} type='text' value={key} onChange={(e) => updateCulomns(e)} /></th>)}

                </tr>
              </thead>
              <tbody>
                {
                  data.map((item, index) => (
                    <tr key={index}>

                      {culomns.map((value, index) => <td key={index}>{item[value]}</td>)}

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
          <input type="number" name="key" id="key" onChange={(e) => setnombreWrrap(e.target.value)} />

          <div style={{ display: 'flex' }}>{items}</div>

        </div>
      }
    </div>
  );
}

export default ExcelReader;