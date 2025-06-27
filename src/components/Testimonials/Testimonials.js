import React from 'react'
import Slider from "react-slick";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import test1 from '../../assets/test1.svg';
import test2 from '../../assets/test2.svg';
import test3 from '../../assets/test3.svg';

// Slide data
const deals = [
  {
    id: 1,
    img: test1,
    name: "Full Name",
    testimonial:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat."
  },
  {
    id: 2,
    img: test2,
    name: "Full Name",
    testimonial:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat."
  },
  {
    id: 3,
    img: test3,
    name: "Full Name",
    testimonial:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat."
  },
];

// Custom Arrow component
const Arrow = ({ onClick, direction }) => (
  <button
    onClick={onClick}
    className={`absolute top-1/2 -translate-y-1/2 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-[#C5A291] backdrop-blur-lg transition
      ${direction === "prev" ? "left-2" : "right-2"}`}
  >
    {direction === "prev" ? (
      <ArrowLeftIcon className="h-5 w-5 text-white" />
    ) : (
      <ArrowRightIcon className="h-5 w-5 text-white" />
    )}
  </button>
);

// Slider settings
const settings = {
  dots: false,
  arrows: true,
  infinite: true,
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 1,
  prevArrow: <Arrow direction="prev" />,
  nextArrow: <Arrow direction="next" />,
  responsive: [
    { breakpoint: 2048, settings: { slidesToShow: 2 } },
    { breakpoint: 1024, settings: { slidesToShow: 1 } },
  ],
};

function Testimonials() {
  return (
    <div className="w-[75%] mx-auto py-8">
        <div className='w-[700px] mx-auto'>
        <h1 className='text-[#B39384] font-[Luxia] text-center text-[27px] font-normal tracking-[0.5px]'>User Testimonials</h1>
        <p className='font-[lato] text-[#53443D] text-[16px] font-normal tracking-[0.5px]'>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.</p>
        </div>
        
      <Slider {...settings}>
        {deals.map((deal) => (
          <div key={deal.id} className="flex flex-col items-start p-4 gap-5">
            <div className="bg-[#EDE2DD] rounded-[24px]">
              <div className="w-[300px] h-[250px] mx-auto flex flex-col items-center justify-center gap-3">
                <img src={deal.img} alt="testimonial-profile" className="w-16 h-16 rounded-full object-cover" />
                <div className="grid text-center">
                  <span className="font-semibold">{deal.name}</span>
                  <span className="text-sm text-gray-600">{deal.testimonial}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default Testimonials;
