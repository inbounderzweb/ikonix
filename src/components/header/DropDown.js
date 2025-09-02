import React from 'react';
import { useNavigate } from 'react-router-dom';

function DropDown({ onSelect = () => {} }) {
  const navigate = useNavigate();

  const handleNavigate = (path,filter) => {
    navigate(path, { state: { activeFilter: filter } });
    onSelect();       // tell Header to close the menu

  };


 

  return (
    <div className="w-[80%] mx-auto relative">
      <div className="absolute right-0 w-[700px] bg-gray-100 border-[1px] border-gray-400 mb -mr-[20.5rem] mt-4 rounded-[16px]">
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 p-6'>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2 cursor-pointer" onClick={() => handleNavigate('/shop', 'men')}>Men’s Perfume</h3>
            <ul className="space-y-2 text-sm text-gray-700">
             
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2 cursor-pointer" onClick={() => handleNavigate('/shop', 'women')}>Women’s Perfume</h3>
            <ul className="space-y-2 text-sm text-gray-700">
         
            </ul>
            <div className="mt-4">
              <button
                className="bg-[#BEC2C7] py-2 px-2 rounded-md w-full text-sm font-light tracking-wide text-black cursor-pointer"
                onClick={() => handleNavigate('/shop')}
              >
                View all collections
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2" onClick={() => handleNavigate('/shop', 'bestSellers')}>Our Best Sellers</h3>
            <ul className="space-y-2 text-sm text-gray-700">
  
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DropDown;
