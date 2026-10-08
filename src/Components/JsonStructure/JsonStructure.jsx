import Name from "./Name"
const JsonStructure = (
  { name,
    handleCheckboxes,
    data,
    updateJsonFile,
    setselctedColumns,
    selctedColumns,
    setJsonFile,
    jsonFile }) => {
  return (
    typeof data[name] === 'object'
      ?
      <div className='holder'>
        <span style={{ marginLeft: '25px' }}>

          <label >{name}</label>
          <i className="fa-solid fa-hand-point-down"></i>
        </span>
        <div>
          {
            [...Object.keys(data[name])].map((el, i) =>
              <div key={i} style={{ marginLeft: '40px' }}>
                <Name
                  name={el}
                  setJsonFile={setJsonFile}
                  jsonFile={jsonFile}
                  updateJsonFile={updateJsonFile}
                  setselctedColumns={setselctedColumns}
                  selctedColumns={selctedColumns}
                />
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
      :
      <Name
        name={name}
        setJsonFile={setJsonFile}
        jsonFile={jsonFile}
        updateJsonFile={updateJsonFile}
        setselctedColumns={setselctedColumns}
        selctedColumns={selctedColumns}
      />

  )
}

export default JsonStructure