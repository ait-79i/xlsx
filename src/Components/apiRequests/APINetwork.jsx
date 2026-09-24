import axios from 'axios'
import { API_URL } from '../../config'
import { useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import RequestBody from "../apiRequests/RequestBody";
import { disableinputs } from '../CommanFunctions';
import CheckHeader from './checkHeader';
import NewHeader from './NewHeader';
import VisualizeButton from '../VisualizeButton';
import { useJwt } from "react-jwt";
import { useTranslation } from 'react-i18next';



const APINetwork = ({ bodyRequestData, setVisualData }) => {
  const { t } = useTranslation()

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

  useEffect(() => {
    console.log(heads)
  }, [heads])
  const [validation, setvalidation] = useState('')


  useEffect(() => {
    disableinputs(method)
  }, [method])



  const handleSendRequest = async () => {
    validateToken()
    setResponse('')
    console.log()
    if (method === "") {
      setvalidation(t('api.errors.chooseMethod'))

    } else if (url.trim() === '') {
      setvalidation(t('api.errors.emptyUrl'))
    } else {
      setvalidation("")


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
            const deleteResponse = await axios({
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


  }


  const { isExpired } = useJwt(localStorage.getItem("token"));

  const validateToken = () => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API_URL}/isUserAuth`, {
        headers: { "x-access-token": token },
      }).then((response) => {
        if (response.data?.auth !== true || isExpired) {
          localStorage.removeItem("token")
          window.location.href = '/login'
        }
      })
  };




  return (
    <div className="container">
      <div className="row">
        <div className="col-12">
          <div className="row gap-0">
            <div className="col-2">
              <select className="form-select" onChange={(e) => setMethod(e.target.value)}>
                <option value="" >{t('api.httpMethod')}</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="col-8">
              <input type="text" className="form-control" dir="ltr" placeholder={t('api.urlPlaceholder')}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="col-2">
              <button className="btn btn-outline-secondary"
                onClick={handleSendRequest}
              >{t('api.send')}
              </button>
            </div>
            <div className="row">

              <div className='text-danger ms-5'>{validation}</div>
              <div className="d-flex  mt-2">
                <div className="col-4 px-2">
                  <div className="container">
                    <div className='text-center'>{t('api.headers')}</div>
                    <div className="d-flex">
                      <div className="col"></div>
                      <div className="col">{t('api.key')}</div>
                      <div className="col">{t('api.value')}</div>
                    </div>

                    <hr />

                    {heads.map((head, i) =>
                      <CheckHeader
                        key={i}
                        i={i}
                        hedKey={Object.keys(head)[0]}
                        hedvalue={head[Object.keys(head)[0]]}
                        heads={heads}
                        headers={headers}
                        setHeaders={setHeaders}
                        setheads={setheads}
                      />
                    )}
                    <NewHeader
                      setheads={setheads}
                      heads={heads} />

                  </div>
                </div>
                <div className="col-4 px-2">
                  <div className='text-center'>{t('api.body')}</div>
                  <RequestBody
                    data={bodyRequestData ? bodyRequestData : body}
                    setBody={setBody}
                  />
                </div>
                <div className="col-4 px-2">
                  <div className='d-flex justify-content-between'>
                    <span>{t('api.response')}</span>
                    {response?.data !== undefined && typeof response.data === 'object' &&
                      <VisualizeButton data={response.data} setVisualData={setVisualData} label={t('api.visualizeResponse')} />}
                  </div>
                  <SyntaxHighlighter language="javascript"
                    dir="ltr"
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



