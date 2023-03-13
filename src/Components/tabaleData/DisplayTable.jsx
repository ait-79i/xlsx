import Column from './Column'
import './style.css'
const DisplayTable = ({ data, culomns, setJsonFile }) => {

  return (
    <div className='scroll-div'>
      <table className='content-table'>
        <thead>
          <tr>
            {culomns.map((name, index) =>
              <Column
                key={index}
                index={index}
                name={name}
                data={data}
                setJsonFile={setJsonFile}
              />
            )}

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
    </div>
  )
}

export default DisplayTable