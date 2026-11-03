import React from 'react'
import './mascot.css'

// The brand sloth. Images live in public/images/brand, sizes are the files' own
// so the browser reserves the space before they load.
const POSES = {
  main: [652, 800],
  logo: [800, 730],
  working: [800, 475],
  success: [781, 800],
  error: [651, 800],
  empty: [800, 371],
}

// motion: float | sway (hanging) | pop (appears then floats) | wobble | peek (slides up) | none
const Mascot = ({ pose = 'main', motion = 'float', className = '', alt = '' }) => {
  const [width, height] = POSES[pose]
  return (
    <img
      src={`/images/brand/mascot-${pose}.webp`}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      decoding="async"
      className={`mascot mascot--${motion} ${className}`.trim()}
    />
  )
}

// The sloth face shown before the product name; the name next to it is the accessible text
export const BrandMark = () => (
  <img src="/images/brand/mascot-logo.webp" width={800} height={730} alt="" aria-hidden="true" draggable={false} className="brand-mark" />
)

export default Mascot
