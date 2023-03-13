import Name from "./Name"

const JsonStructure = (
  {
    name,
    handleCheckboxes,
    data,
    updateJsonFile,
    setselctedColumns,
    selctedColumns,
    setJsonFile,
    jsonFile
  }
) => {

  return (
    typeof data[name] === 'object'
      ?
      <div className='holder'>
        <span>
          <Name name={name}
            setJsonFile={setJsonFile}
            jsonFile={jsonFile}

          />
          <i className="fa-solid fa-hand-point-down"></i>

        </span>
        <div>

          {
            [...Object.keys(data[name])].map((el, i) =>
              <div key={i} style={{ marginLeft: '40px' }}>
                <label>{el}</label>

                <button
                  title={`remove ${el} from here`}
                  className='btn-x'
                  onClick={
                    () => {
                      updateJsonFile(el)
                      setselctedColumns([...selctedColumns.filter(value => value !== el)])
                    }
                  }
                ><ion-icon name="arrow-undo-outline"></ion-icon></button>
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
                      setJsonFile={setJsonFile}
                      jsonFile={jsonFile}
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
          title={`remove ${name} from here `}
          className='btn-x'
          onClick={
            () => {
              updateJsonFile(name)
              setselctedColumns([...selctedColumns.filter(value => value !== name)])
            }
          }
        ><ion-icon name="arrow-undo-outline"></ion-icon></button>
      </div>
  )
}

export default JsonStructure