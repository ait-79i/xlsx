import React, { useEffect, useState } from 'react';
import DropExcelFile from './Drag&Drop/DropExcelFile';
import DisplayTable from './tabaleData/DisplayTable';
import DisplayJson from './Popup/DisplayJson';
import JsonCols from './JsonStructure/JsonCols';
import './style.css'
import DownloadJson from './DownloadJson';
import JsonStructureFormatt from './JsonStructure/JsonStructureFormatt';
import CopyToClipboard from './CopyToClipboard';
import SendButton from './SendButton';
import { PreventReload } from './CommanFunctions';


function MainPage({ setBodyRequestData }) {

  const [data, setData] = useState([]);
  const xlsxculomns = Object.keys(data[0] === undefined ? [] : data[0]);
  const [jsonFile, setJsonFile] = useState([])
  const [culomns, setCulomns] = useState([])
  const [modify, setmodify] = useState(true)


  useEffect(() => {
    setCulomns(Object.keys(jsonFile[0] === undefined ? [] : jsonFile[0]))
  }, [jsonFile])

  useEffect(() => {
    setCulomns(xlsxculomns)
    setJsonFile([...data])
  }, [data])

  PreventReload()


  return (
    <div>
      {/* ------------- Drag And Drop Zone ----------- */}
      <DropExcelFile  setData={setData} />

      <div>
        {data.length > 0
          &&
          <div>
            {/* ------------ Excel table ---------- */}

            <DisplayTable
              data={data}
              culomns={xlsxculomns}
              setJsonFile={setJsonFile}
            />

            <div className='d-flex ms-3' >

              {/* //----------- Copy Code to Clipboard --------*/}

              {/* //----------- display formatted json --------*/}
              <div>
                <CopyToClipboard data={jsonFile} />
                <DisplayJson data={jsonFile} />
              </div>

              {/* //----------- Modify JSON structure --------*/}
              <div className='ms-5'>
                {
                  modify ?
                    <JsonStructureFormatt
                      culomns={culomns}
                      setJsonFile={setJsonFile}
                      jsonFile={jsonFile}
                      xlsxculomns={xlsxculomns}
                      JsonCols={JsonCols}
                    />

                    : null
                }

                <div className='d-flex ms-3'>

                  {/* //--------------display modify json form  ----------------- */}

                  <input type="button" value={modify === true ? 'hide' : 'modifier la structure'} onClick={() => setmodify(!modify)} />

                  {/* //--------------Download json data in a file ----------------- */}


                  <DownloadJson data={jsonFile} />

                  {/* //--------------Send new json format to api component URL ----------------- */}

                  <SendButton data={jsonFile} setBodyRequestData={setBodyRequestData} />

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