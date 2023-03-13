import axios from 'axios'
import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import RequestBody from './RequestBody';


const APINetwork = ({ bodyRequestData }) => {

  const [method, setMethod] = useState('')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState({})
  const [body, setBody] = useState('')
  const [response, setResponse] = useState('')
  const [heads, setheads] = useState([
    {
      "Accept": "application/json, text/plain, */*"
    }, {
      'Content-Type': 'application/json'
    },
  ])




  const handleSendRequest = async () => {
    setResponse('')

    try {
      switch (method) {

        case 'GET':
          const getResponse = await axios({
            method: 'GET',
            url: url,
          });
          setResponse(getResponse)
          break;

        case 'POST':
          const postResponse = await axios({
            method: 'POST',
            url: url,
            data: body,
            headers: headers
          })
          setResponse(postResponse)
          break;

        case 'PUT':
          const putResponse = await axios({
            method: 'PUT',
            url: url,
            data: body,
            headers: headers,
          });
          setResponse(putResponse)
          break;

        case 'PATCH':
          const patchResponse = await axios({
            method: 'PATCH',
            url: url,
            data: body,
            headers: headers,
          });
          setResponse(patchResponse)
          break;

        case 'DELETE':
          let deleteResponse = await axios({
            method: 'DELETE',
            url: url,
          })
          setResponse(deleteResponse)
          break;

        default:
          break;
      }


    } catch (error) {
      setResponse(error)
    }


  }

  const handleCheck = (e) => {
    const activeCheckbox = e.target.checked

    if (activeCheckbox === true) {
      const key = e.target.value
      heads.map((hed) => {
        if (Object.keys(hed)[0] === key) {
          var headersCopy = {}
          headersCopy = { ...headers }
          headersCopy[key] = hed[key]
          setHeaders(headersCopy)
        }
      })
    } else {
      const key = e.target.value
      const copy = { ...headers }
      delete copy[key]
      setHeaders(copy)
    }
  }

  const [newheaderKey, setNewheaderKey] = useState('')
  const [newheaderValue, setNewheaderValue] = useState('')

  const saveNewHeader = () => {
    var obj = {}
    obj[newheaderKey] = newheaderValue
    setheads([...heads, obj])
    setNewheaderKey('')
    setNewheaderValue('')
  }


  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="row gap-0">
            <div className="col-2">
              <select className="form-select" onChange={(e) => setMethod(e.target.value)}>
                <option >HTTP Method</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="col-8">
              <input type="text" className="form-control" placeholder="Enter request URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="col-2">
              <button className="btn btn-outline-secondary"
                onClick={handleSendRequest}
              >send
              </button>
            </div>
            <div className="row">


              <div className="d-flex  mt-2">
                <div className="col-4 px-2">
                  <div className="container">
                    <div className='text-center'>headers </div>
                    <div className="d-flex">
                      <div className="col"></div>
                      <div className="col">key</div>
                      <div className="col">value</div>
                    </div>

                    <hr />

                    {heads.map((head, i) =>
                      <div key={i} className="d-flex">
                        <input type="checkbox" value={Object.keys(head)[0]} onChange={(e) => handleCheck(e)} />
                        <div className="col">{Object.keys(head)[0]}</div>
                        <div className="col">{head[Object.keys(head)[0]]}</div>
                      </div>
                    )}

                    <div className="d-flex">
                      <input type="text"
                        name="" id=""
                        placeholder='key...'
                        value={newheaderKey}
                        onChange={(e) => { setNewheaderKey(e.target.value) }}
                      />
                      <input type="text"
                        name=""
                        id=""
                        placeholder='value...'
                        value={newheaderValue}
                        onChange={(e) => { setNewheaderValue(e.target.value) }}
                      />
                    </div>
                    <button
                      onClick={saveNewHeader}
                    >addd</button>
                  </div>
                </div>
                <div className="col-4 px-2">
                  <div className='text-center'>Body</div>
                  <RequestBody data={bodyRequestData ? bodyRequestData : body} setBody={setBody} bodyRequestData={bodyRequestData} />
                </div>
                <div className="col-4 px-2">
                  <div className='text-center'>Response</div>
                  <SyntaxHighlighter language="javascript"
                    // style={darcula}
                    wrapLongLines={true}
                    customStyle={{ height: '200px', width: '100%', padding: '10px', fontSize: '11px', overflow: 'hidden', overflowY: 'scroll' }}
                  >
                    {response === '' ? '' : JSON.stringify(response, null, 1)}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default APINetwork



