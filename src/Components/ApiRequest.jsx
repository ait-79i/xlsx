import React, { useState } from 'react';
import axios from 'axios';

function ApiRequest() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [responseBody, setResponseBody] = useState('');

  const handleUrlChange = (event) => {
    setUrl(event.target.value);
  };

  const handleMethodChange = (event) => {
    setMethod(event.target.value);
  };

  const handleRequestBodyChange = (event) => {
    setRequestBody(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios({
        method: method,
        url: url,
        data: requestBody
      });
      setResponseBody(JSON.stringify(response.data, null, 2));
    } catch (error) {
      setResponseBody(JSON.stringify(error.response.data, null, 2));
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          URL:
          <input type="text" value={url} onChange={handleUrlChange} />
        </label>
        <br />
        <label>
          Method:
          <select value={method} onChange={handleMethodChange}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
        <br />
        <label>
          Request Body:
          <br />
          <textarea value={requestBody} onChange={handleRequestBodyChange} />
        </label>
        <br />
        <button type="submit">Send Request</button>
      </form>
      <br />
      <label>
        Response Body:
        <br />
        <textarea value={responseBody} readOnly />
      </label>
    </div>
  );
}

export default ApiRequest;
