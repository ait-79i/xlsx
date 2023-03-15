import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useState } from 'react';
function RequestBody({ data, setBody }) {
  const [isValid, setIsValid] = useState(true);

  return (
    <>
      {!isValid && <p style={{ color: 'red' }}>JSON sythax is not valid.</p>}

      <CodeMirror
        value={JSON.stringify(data === '' ? {} : data, null, 2)}
        height="200px"
        extensions={[javascript({ json: true })]}
        onChange={(val) => {
          if (val !== '') {
            try {
              setBody(JSON.parse(val))
              setIsValid(true)
            } catch (error) {
              setIsValid(false)
            }
          }
        }}
      />

    </>

  );
}
export default RequestBody;