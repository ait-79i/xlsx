import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next'
const DisplayJson = ({ data }) => {
  const { t } = useTranslation()

  return (
    <SyntaxHighlighter
      language="javascript"
      style={darcula}
      wrapLongLines={true}
      dir="ltr"
    >
      {`- ${t('jsonPreview.itemLooksLike')}        
          ${JSON.stringify(data[0], null, 4)}          
        `}
    </SyntaxHighlighter>
  )
}

export default DisplayJson