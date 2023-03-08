import React from 'react'


const Head = () => {
  return (
    <>
      <section className="head">
        <div className="container d_flex">
          <div className="left row">
            <i className="fa fa-phone"></i>
            <label htmlFor="">+212560121212</label>
            <i className="fa fa-envelope"></i>
            <label htmlFor="">email@gmail.com</label>
          </div>
          <div className="right row RText">
            <i className="fa fa-light fa-earth-africa"></i>
            <label htmlFor="">world</label>
            <span><i className="fa fa-duotone fa-flag-usa"></i></span>
            <label htmlFor="">USA</label>
          </div>
        </div>
      </section>
    </>
  )
}

export default Head