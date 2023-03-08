import React from 'react';
import DisplayJson from './DisplayJson';
import './style.css'

const PopUp = ({ open, onClose, data }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} className='overlay'>
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        className='modalContainer'
      >
        <DisplayJson data={data} />
        <p className='closeBtn' onClick={onClose}>
          X
        </p>

      </div>
    </div>
  );
};

export default PopUp;

