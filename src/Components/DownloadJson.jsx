import React from 'react'
import { useTranslation } from 'react-i18next'

const DownloadJson = ({ data }) => {
  const { t } = useTranslation()

  const downloadFile = () => {
    const jsonStr = JSON.stringify(data);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const downloadLink = document.createElement('a');
    downloadLink.download = 'data.json';
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.click();
  };

  return (

    <button className=' btn ' onClick={downloadFile}>{t('actions.downloadJson')}</button>
  )
}

export default DownloadJson