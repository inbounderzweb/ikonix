import React from 'react'
import info from '../../assets/info.svg'
import info1 from '../../assets/info1.svg'
import info2 from '../../assets/info2.svg'
import { useNavigate } from 'react-router-dom'

function CollectionCards() {

const Navigate = useNavigate();

  const handleCardClick = (index) => {
    if (index === 0) {
      Navigate("/contact");
    } else if (index === 1) {
      Navigate("/shop", { state: { activeFilter: "women" } });
    } else {
      Navigate("/shop", { state: { activeFilter: "men" } });
    }
  };

  return (
   <div className="mx-auto w-[90%] md:w-full">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">

    {[info, info1, info2].map((image, index) => (
      <div
        key={index}
        onClick={() => handleCardClick(index)}
        className="w-full overflow-hidden cursor-pointer rounded-[6px] md:rounded-[8px] transition-all duration-300 hover:shadow-lg"
      >
        <img
          src={image}
          alt={`Collection ${index + 1}`}
          className="block w-full h-auto"
        />
      </div>
    ))}

  </div>
</div>
  )
}

export default CollectionCards
