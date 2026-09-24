import { useEffect, useState } from 'react'
import DownloadJson from './DownloadJson'
import DropJsonFile from './Drag&Drop/DropJsonFile'
import JsonStructureFormatt from './JsonStructure/JsonStructureFormatt'
import DisplayJson from './Popup/DisplayJson'
import SendButton from './SendButton'
import VisualizeButton from './VisualizeButton'
import DownloadExcel from './DownloadExcel'

const ModifyJsonStructureComp = ({ setBodyRequestData, setVisualData }) => {

  const [data, setData] = useState([])
  const firstJsonColumns = Object.keys(data[0] === undefined ? [] : data[0])

  const [culomns, setculomns] = useState([])
  useEffect(() => {
    setculomns(Object.keys(data[0] === undefined ? [] : data[0]))
  }, [data])

  return (
    <div>
      <h1>Modify Json Structure</h1>
      <DropJsonFile setData={setData} />

      {data.length !== 0 &&
        <>
          <div className='d-flex '>
            <div className='wrapper'>
              <JsonStructureFormatt
                culomns={culomns}
                setJsonFile={setData}
                jsonFile={data}
                xlsxculomns={firstJsonColumns}
              />
            </div >

            <DisplayJson data={data} />

          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around' }}>

            <DownloadJson data={data} />

            <DownloadExcel data={data} />

            <SendButton data={data} setBodyRequestData={setBodyRequestData} />

            <VisualizeButton data={data} setVisualData={setVisualData} />

          </div>
        </>

      }

    </div>
  )
}

export default ModifyJsonStructureComp