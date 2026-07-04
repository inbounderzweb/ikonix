import React from "react";
import { useNavigate } from "react-router-dom";

import info from "../../assets/info.svg";
import info1 from "../../assets/info1.svg";
import info2 from "../../assets/info2.svg";

function CollectionCards() {
  const navigate = useNavigate();

  const collections = [
    {
      id: 1,
      image: info,
      alt: "Bring Your Dream Fragrance to Life",
    },
    {
      id: 2,
      image: info1,
      alt: "Women's Collection",
    },
    {
      id: 3,
      image: info2,
      alt: "Men's Collection",
    },
  ];

  return (
    <section className="w-full flex justify-center mt-5">
      <div className="w-[95%] max-w-[1640px] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {collections.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate("/contact")}
            className="cursor-pointer rounded-[24px] overflow-hidden"
          >
            <img
              src={item.image}
              alt={item.alt}
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default CollectionCards;


// import React from 'react'
// import info from '../../assets/info.svg'
// import info1 from '../../assets/info1.svg'
// import info2 from '../../assets/info2.svg'
// import { useNavigate } from 'react-router-dom'

// function CollectionCards() {

// const Navigate = useNavigate();

//   return (
// //     <div className='mx-auto w-[95vw] max-w-[1640px] mt-[18px]'>

// // <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>

// // <div onClick={()=>Navigate(`/contact`)} className='w-full h-[220px] rounded-[24px] bg-no-repeat bg-cover bg-center cursor-pointer' style={{ backgroundImage: `url(${info})`}}></div>
// // <div onClick={()=>Navigate(`/contact`)} className='w-full h-[220px] rounded-[24px] bg-no-repeat bg-cover bg-center cursor-pointer' style={{ backgroundImage: `url(${info1})`}}></div>
// // <div onClick={()=>Navigate(`/contact`)} className='w-full h-[220px] rounded-[24px] bg-no-repeat bg-cover bg-center cursor-pointer' style={{ backgroundImage: `url(${info2})`}}></div>

// // </div>

// //     </div>
// <div className='w-full flex justify-center'>
//   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-5 w-[95%]">
//   {[
//     { image: info },
//     { image: info1 },
//     { image: info2 },
//   ].map((item, index) => (
//     <div
//       key={index}
//       onClick={() => Navigate("/contact")}
//       className="cursor-pointer bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm"
//     >
//       <div
//         className="h-[220px] w-full bg-cover bg-center bg-no-repeat"
//         style={{ backgroundImage: `url(${item.image})` }}
//       />
//     </div>
//   ))}
// </div>
// </div>
//   )
// }

// export default CollectionCards
