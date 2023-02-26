import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { darcula } from 'react-syntax-highlighter/dist/esm/styles/prism';
const DisplayJson = ({ data }) => {

  return (
    <div >
      <SyntaxHighlighter language="javascript" style={darcula} >
        {`- Each item in your JSON file looks like :
        
          ${JSON.stringify(data)} 
          
        `}
      </SyntaxHighlighter>
    </div>
  )
}

export default DisplayJson