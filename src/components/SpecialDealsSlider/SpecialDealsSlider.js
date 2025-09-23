// src/components/SpecialDealsSlider.js
import React from "react";
import Slider from "react-slick";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import spl1 from '../../assets/spl1.svg';
import spl2 from '../../assets/spl2.svg';
import { useNavigate } from "react-router-dom";

// Slide data
const deals = [
  {
    id: 1,
    img: spl1,
    title1: "Special Day Special Offer",
    blurb: "Lorem ipsum + dolor sit amet ipsum",
    oldPrice: "Rs.899/-",
    newPrice: "Rs.699/-",
    dataurl:`/product-details/68?vid=1`,
  },
  {
    id: 2,
    img: spl2,
    title1: "Special Day Special Offer",
    blurb: "Lorem ipsum + dolor sit amet ipsum",
    oldPrice: "Rs.899/-",
    newPrice: "Rs.699/-",
    dataurl:`product-details/68?vid=1`,

  },
];

// Custom arrow buttons
const Arrow = ({ onClick, direction }) => (
  <button
    onClick={onClick}
    className={`absolute top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10
                backdrop-blur-lg transition hover:bg-white/20
                ${direction === "prev" ? "left-0" : "right-0"}`}
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
  dots: true,
  arrows: true,
  infinite: true,
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 1,
  prevArrow: <Arrow direction="prev" />,
  nextArrow: <Arrow direction="next" />,
  appendDots: dots => (
    <div className="mt-6 flex justify-center items-center gap-2">
      {dots}
    </div>
  ),
  customPaging: i => (
    <div className="dot h-1 w-[25px] bg-[#44322B] rounded-full transition-all duration-300 mt-2" />
  ),
  responsive: [
    {
      breakpoint: 1024,
      settings: {
        slidesToShow: 1,
        arrows: false,
        dots: true,
        appendDots: dots => (
          <div className="mt-6 flex justify-center items-center gap-2">
            {dots}
          </div>
        ),
        customPaging: i => (
          <div className="dot h-1 w-[25px] bg-[#44322B] rounded-full transition-all duration-300 mt-2" />
        ),
      },
    },
  ],
};

export default function SpecialDealsSlider() {

const Navigate = useNavigate();


  return (
    <>
      {/* Override slick active-dot color */}
      <style>{`
        .slick-dots li.slick-active div {
          background-color: white !important;
          
        }
      `}</style>

      <section className="bg-[#e8d5cf] py-16">
        <div className="mx-auto w-[95%] md:w-[80%] lg:px-4 px-0">
          {/* Header */}
          <h1 className="text-[27px] text-[#8C7367] text-center tracking-[0.5px]">
            special deals
          </h1>
          <p className="text-[#53443D] text-[16px] font-[lato] text-center font-[400] w-full md:w-[710px] mx-auto">
            Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
            diam nonummy nibh euismod tincidunt ut laoreet dolore magna
            aliquam erat volutpat.
          </p>

          {/* Slider */}
          <Slider {...settings} className="lg:mt-12 mt-4">
            {deals.map(deal => (
              <div key={deal.id} className="px-3">
                <div className="relative overflow-hidden rounded-[24px]">
                  <img
                    src={deal.img}
                    alt={deal.title1}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 md:bg-transparent z-10" />
                  <div className="absolute inset-0 z-20 flex flex-col justify-center md:pl-[50%] p-6 text-white text-left">
                    <span className="text-[18px] md:text-[27px] font-[luxia]">
                      {deal.title1}
                    </span>
                    <p className="text-[13px] font-fancy">{deal.blurb}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="grid">
                        <span className="line-through text-[#F9F6F4] text-[12px] font-normal font-[lato]">
                          {deal.oldPrice}
                        </span>
                        <span className="text-[#F9F6F4] text-[16px] font-[700] font-[lato]">
                          {deal.newPrice}
                        </span>
                      </div>
                      <button onClick={()=>Navigate(`${deal.dataurl}`)} className="text-[#13181F] font-[lato] text-[14px] bg-[#C5A291] py-[8px] px-[20px] rounded-[24px]">
                        Add To Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}
