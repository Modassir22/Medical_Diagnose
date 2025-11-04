import React from 'react'
import HeroInputPage from '../HeroInputPage'

const HeroSection = () => {
  return (
    <div>
        <div className='text-center mt-5'>
            <h1  className='text-6xl font-bold text-black'>Feels Bad, ILL and Uncomfort <br /> <span style={{fontFamily:"Story Script",}} className='text-[#12BC53] underline'>Try Goodwell</span></h1>
            <p className='text-1xl mt-5'>A place where you can diagnose your-Self free of Cost <span style={{fontFamily:"Story Script",}} className='text-black underline text-2xl ml-1'> in single click</span></p>
        </div>
        <div className='text-center'>
            <HeroInputPage/>
        </div>
    </div>
  )
}

export default HeroSection