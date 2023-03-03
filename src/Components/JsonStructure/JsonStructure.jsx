
const JsonStructure = ({ name, handleCheckboxes, data, updateJsonFile, setselctedColumns, selctedColumns
}) => {

  return (
    typeof data[name] === 'object'
      ?
      <div className='holder'>
        <label style={{ marginLeft: '25px' }} htmlFor={name}>{name} <i class="fa-solid fa-hand-point-down"></i></label>
        <div>

          {
            [...Object.keys(data[name])].map((el, i) =>
              <div key={i} style={{ marginLeft: '40px' }}>
                <label>{el}</label>

                <button
                  className='btn-x'
                  onClick={
                    () => {
                      updateJsonFile(el)
                      setselctedColumns([...selctedColumns.filter(value => value !== el)])
                    }
                  }
                ><i className="fa fa-reply"></i></button>
                {
                  typeof data[name][el] === 'object'
                  &&
                  [...Object.keys(data[name][el])].map((col, id) =>
                    <JsonStructure
                      key={id}
                      name={col}
                      handleCheckboxes={handleCheckboxes}
                      data={data[name][el]}
                      updateJsonFile={updateJsonFile}
                      setselctedColumns={setselctedColumns}
                      selctedColumns={selctedColumns}
                    />
                  )}
              </div>
            )
          }
        </div>
      </div>
      : <div className='holder'>
        <label style={{ marginLeft: '25px' }} htmlFor={name}>{name}</label>
        <button
          className='btn-x'
          onClick={
            () => {
              updateJsonFile(name)
              setselctedColumns([...selctedColumns.filter(value => value !== name)])
            }
          }
        ><i className="fa fa-reply"></i></button>
      </div>
  )
}

export default JsonStructure