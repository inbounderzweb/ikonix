import React from 'react'
import info from '../../assets/info.svg'
import info1 from '../../assets/info1.svg'
import info2 from '../../assets/info2.svg'
import { useNavigate } from 'react-router-dom'

function CollectionCards() {

const Navigate = useNavigate();

  return (
   <div className="mx-auto w-[90%] max-w-[1640px] mt-5">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

    {[info, info1, info2].map((image, index) => (
      <div
        key={index}
        onClick={() => Navigate("/contact")}
        className="w-full rounded-3xl overflow-hidden cursor-pointer border border-gray-200 hover:shadow-lg transition-all duration-300"
      >
        <img
          src={image}
          alt={`Collection ${index + 1}`}
          className="w-full h-auto object-contain"
        />
      </div>
    ))}

  </div>
</div>
  )
}

export default CollectionCards
