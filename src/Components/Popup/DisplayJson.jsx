import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
const DisplayJson = ({ data }) => {

  return (
    <SyntaxHighlighter
      language="javascript"
      style={darcula}
      wrapLongLines={true}
    >
      {`- Each item in your JSON file looks like :        
          ${JSON.stringify(data[0], null, 4)}          
        `}
    </SyntaxHighlighter>
  )
}

export default DisplayJson