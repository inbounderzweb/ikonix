import React from 'react'

function DropDown() {
  return (
    <div className="w-[80%] mx-auto relative"> {/* Header container (80%) */}

      <div className="absolute right-0 w-[700px] bg-gray-100 border-[1px] border-gray-400 mb -mr-[20.5rem] mt-4 rounded-[16px]">
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 p-6'>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Men’s Perfume</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Men’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Men’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Men’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Men’s perfume</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Women’s Perfume</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Women’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Women’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Women’s perfume</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Women’s perfume</li>
            </ul>
            <div className="mt-4">
              <button className="bg-[#BEC2C7] py-2 px-2 rounded-md w-full text-sm  font-light tracking-wide text-black">
                View all collections
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Other Collection</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Other Collection</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Other Collection</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Other Collection</li>
              <li className='border-b-[1px] border-gray-400 mb-4 pb-4'>Other Collection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DropDown
