import React, { useState } from 'react';
import DisplayJson from './DisplayJSON/DisplayJson';
import DragAndDrop from './Drag&Drop/DragAndDrop';
import DisplayTable from './tabaleData/DisplayTable';


function MainPage() {

  const [data, setData] = useState([]);
  const culomns = Object.keys(data[0] === undefined ? [] : data[0]);


  //todo change culomns value



  const [key, setkey] = useState(null);
  const [selctedColumns, setselctedColumns] = useState([]);
  const [wrap, setWrap] = useState(false);
  const [nombreWrrap, setnombreWrrap] = useState(1);



  //checked boxes
  const handleCheckboxes = (e) => {
    const activeCheckbox = e.target.checked

    if (activeCheckbox === true) {
      setselctedColumns(oldselection => [...oldselection, e.target.value])
    } else {

      //!don't wonna be filtered
      setselctedColumns(setselctedColumns.filter(value => value !== e.target.value))
    }

  }
  // console.log(selctedColumns);

  const keyHandle = (e) => {
    setkey(e.target.value)
  }


  //* genereate the json file 

  const generateJsonFile = () => {

    var arr = []

    for (const item of data) {
      var json = {}
      var obj = {}
      for (const elm of culomns) {

        if (!selctedColumns.includes(elm)) {
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




  const sendRequest = () => {


  }



  const items = [];
  for (let i = 0; i < nombreWrrap; i++) {
    items.push(
      <div key={i} className='wrapper'>
        <input type="text" name="key" id="key" onChange={(e) => keyHandle(e)} placeholder='give a key to these values ...' />
        {culomns.map((key, index) =>
          <div key={index}>

            <input
              type="checkbox"
              id={index}
              value={key}
              onChange={handleCheckboxes}
            />
            <span >{key}</span>

          </div>)
        }
      </div>
    );
  }



  return (
    <div>
      <DragAndDrop setData={setData} />


      <div>
        {data.length > 0
          &&
          <div>
            <div className='' style={{ display: 'flex' }}>
              <DisplayTable data={data} culomns={culomns} />
              <div>
                <div className="buttons">
                  <button onClick={() => {
                    setWrap(true)
                  }}>
                    wrap
                  </button>
                  <button onClick={generateJsonFile}>Generate</button>
                  <button onClick={sendRequest}>Send Data</button>

                </div>
                {wrap &&
                  <div>
                    <input type="number" name="key" id="key" onChange={(e) => setnombreWrrap(e.target.value)} />
                    <div style={{ display: 'flex' }}>{items}</div>


                  </div>
                }
              </div>
            </div>
            <DisplayJson data={data[0]} />



          </div>
        }

      </div >


    </div>
  );
}

export default MainPage;