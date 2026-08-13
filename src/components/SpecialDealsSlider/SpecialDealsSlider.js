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
    blurb: "Experience our signature fragrances at special prices",
    oldPrice: "Rs.899/-",
    newPrice: "Rs.699/-",
    dataurl: `/shop`,
  },
  {
    id: 2,
    img: spl2,
    title1: "Special Day Special Offer",
    blurb: "Experience our signature fragrances at special prices",
    oldPrice: "Rs.899/-",
    newPrice: "Rs.699/-",
    dataurl: `/shop`,

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

// Slider settings (desktop/tablet only — mobile uses a native scroll strip below)
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
};

// Card content shared by the mobile scroll strip and the desktop slider
function DealCard({ deal, onNavigate }) {
  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <img
        src={deal.img}
        alt={deal.title1}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20 md:bg-transparent z-10" />
      <div className="absolute inset-0 z-20 flex flex-col justify-center md:pl-[50%] p-4 md:p-6 text-white text-left">
        <span className="text-[14px] leading-snug md:text-[27px] font-heading">
          {deal.title1}
        </span>
        <p className="text-[11px] leading-snug md:text-[13px] font-fancy mt-1 md:mt-0">{deal.blurb}</p>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 md:mt-4">
          <div className="grid">
            <span className="line-through text-[#F9F6F4] text-[10px] md:text-[12px] font-normal font-fancy">
              {deal.oldPrice}
            </span>
            <span className="text-[#F9F6F4] text-[13px] md:text-[16px] font-[700] font-fancy">
              {deal.newPrice}
            </span>
          </div>
          <button onClick={() => onNavigate(deal.dataurl)} className="text-[#13181F] font-fancy text-[12px] md:text-[14px] bg-[#C5A291] py-[6px] md:py-[8px] px-[16px] md:px-[20px] rounded-[24px]">
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
}

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
        <div className="mx-auto w-[90%] lg:w-[80%] lg:px-4 px-0">
          {/* Header */}
          <h1 className="font-heading text-[27px] text-[#8C7367] text-center tracking-[0.5px]">
            Special deals
          </h1>
          <p className="text-[#53443D] text-[16px] font-fancy text-center font-[400] w-full md:w-[710px] mx-auto">
            Our exclusive perfume creations blend rare ingredients and refined expertise. Discover captivating notes that tell your story with confidence and style.
          </p>

          {/* Mobile/tablet: native horizontal scroll, no dots/arrows needed */}
          <div className="lg:hidden mt-4 flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
            {deals.map(deal => (
              <div key={deal.id} className="w-[85%] sm:w-[48%] flex-shrink-0 snap-start">
                <DealCard deal={deal} onNavigate={url => Navigate(url)} />
              </div>
            ))}
          </div>

          {/* Desktop: slick carousel with arrows + dots */}
          <div className="hidden lg:block">
            <Slider {...settings} className="mt-12">
              {deals.map(deal => (
                <div key={deal.id} className="px-3">
                  <DealCard deal={deal} onNavigate={url => Navigate(url)} />
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </section>
    </>
  );
}
