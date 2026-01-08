import React from "react";
import { useNavigate } from "react-router-dom";

function DropDown({ onSelect = () => {} }) {
  const navigate = useNavigate();

  const handleNavigate = (path, filter = "all") => {
    navigate(path, { state: { activeFilter: filter } });
    onSelect(); // close menu
  };

  return (
    <div className="w-[80%] mx-auto relative">
      <div className="absolute right-0 w-[700px] bg-gray-100 border-[1px] border-gray-400 -mr-[20.5rem] mt-4 rounded-[16px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div>
            <h3
              className="text-lg font-semibold text-gray-600 mb-2 cursor-pointer"
              onClick={() => handleNavigate("/shop", "mens")}
            >
              Men’s Perfume
            </h3>
          </div>

          <div>
            <h3
              className="text-lg font-semibold text-gray-600 mb-2 cursor-pointer"
              onClick={() => handleNavigate("/shop", "women")}
            >
              Women’s Perfume
            </h3>

            <div className="mt-4">
              <button
                className="bg-[#BEC2C7] py-2 px-2 rounded-md w-full text-sm font-light tracking-wide text-black cursor-pointer"
                onClick={() => handleNavigate("/shop", "all")}
              >
                View all collections
              </button>
            </div>
          </div>

          <div>
            <h3
              className="text-lg font-semibold text-gray-600 mb-2 cursor-pointer"
              onClick={() => handleNavigate("/shop", "bestSellers")}
            >
              Our Best Sellers
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DropDown;
