import React, { useState } from 'react'

const CopyToClipboard = ({ data }) => {
  const [copy, setCopy] = useState(true)
  return (
    <div style={{ display:"flex", justifyContent:"space-between"}}>
      <div > Copy your data</div>
      {copy ?
        <button
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(data))
            setCopy(false)
            setTimeout(() => {
              setCopy(true)
            }, 3000);
          }}
        >
          <span>
          <ion-icon name="clipboard-outline"></ion-icon>
          </span>
          Copy
        </button>

        :
        <button >
          <span>
            <ion-icon name="checkmark-sharp"></ion-icon>
          </span>
          Copied
        </button>
      }
    </div>
  )
}

export default CopyToClipboard