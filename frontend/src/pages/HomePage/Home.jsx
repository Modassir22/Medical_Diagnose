import React, { useState } from 'react'
import Navbar from '../Layouts/Navbar'
import HeroSection from './HeroSection'
import Cookies from 'js-cookie';

const Home = () => {
  return (
    <div>
        <div className='text-center mt-8'>
            <span style={{fontFamily:"Roboto"}} className='bg-[#b8f3cf] px-5 py-2 rounded-full'>Welcome <span style={{fontFamily:"Story Script"}}>{Cookies.get('name')}!</span></span>
       </div>
        <HeroSection/>
    </div>
  )
}

export default Home