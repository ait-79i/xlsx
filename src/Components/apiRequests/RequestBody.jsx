import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
function RequestBody({ data, setBody }) {
  const { t } = useTranslation();
  const [isValid, setIsValid] = useState(true);

  return (
    <>
      {!isValid && <p style={{ color: 'red' }}>{t('api.invalidBody')}</p>}

      <CodeMirror
        dir="ltr"
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