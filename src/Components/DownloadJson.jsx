import React from 'react'

const DownloadJson = ({ data }) => {

  const downloadFile = () => {
    const jsonStr = JSON.stringify(data);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const downloadLink = document.createElement('a');
    downloadLink.download = 'data.json';
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.click();
  };

  return (

    <button className=' btn ' onClick={downloadFile}>Download json file</button>
  )
}

export default DownloadJson