import React from 'react'
import { Link } from 'react-router-dom'

const PageNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="bg-white shadow-lg rounded-3xl p-10 flex flex-col md:flex-row items-center gap-10 max-w-3xl w-full min-h-[420px]">

        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-bold text-yellow-500 mb-4">
            You seem to be lost!
          </h1>
          <p className="text-gray-600 font-medium">
            The page you're looking for isn't available.
          </p>
          <p className="text-gray-600 font-medium mb-6">
            Try searching again or use the button below.
          </p>

          <Link to='/'>
            <button className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg transition-all transform hover:scale-105">
              <i className="mdi mdi-arrow-left mr-2"></i>Go Back
            </button>
          </Link>
        </div>

        <img 
          src="/src/assets/pagenotfound.svg" 
          alt="404" 
          className="w-52 md:w-72 flex-1"
        />
      </div>
    </div>
  )
}

export default PageNotFound
