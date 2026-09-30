// src/components/SpecialDealsSlider.js
import React from "react";
import Slider from "react-slick";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import banner1 from '../../assets/home/ikonix_banner1.png';
import banner2 from '../../assets/home/ikonix_banner2.png';
import banner3 from '../../assets/home/ikonix_banner3.png';
import banner4 from '../../assets/home/ikonix_banner4.png';
import { useNavigate } from "react-router-dom";

// Slide data
const deals = [
  {
    id: 3,
    img: banner1,
    title1: "Buy 4 × 30ml, Get 1 FREE!",
    blurb: "Stock up on your favourites! Buy 4 bottles of 30ml and get 1 bottle absolutely FREE.",
    dataurl: `/shop`,
    textRight: true,
    dark: true,
  },
  {
    id: 4,
    img: banner2,
    title1: "Buy 3 × 50ml, Get 1 FREE!",
    blurb: "More value, more savings! Buy 3 bottles of 50ml and get 1 bottle FREE.",
    dataurl: `/shop`,
    textRight: true,
    dark: false,
  },
  {
    id: 5,
    img: banner3,
    title1: "Buy 2 × 100ml, Get 1 FREE!",
    blurb: "Go bigger and save more! Buy 2 bottles of 100ml and get 1 bottle FREE.",
    dataurl: `/shop`,
    textRight: true,
    dark: true,
  },
  {
    id: 6,
    img: banner4,
    title1: "More Bottles, More Savings!",
    blurb: "Choose your favourite size, stock up and enjoy exclusive savings on your purchase.",
    dataurl: `/shop`,
    textRight: true,
    dark: true,
  },
];

// Custom arrow buttons
const Arrow = ({ onClick, direction, className = "" }) => (
  <button
    onClick={onClick}
    disabled={className.includes("slick-disabled")}
    className={`absolute top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#44322B]/60
                backdrop-blur-lg transition hover:bg-[#44322B]/80 disabled:opacity-30
                ${direction === "prev" ? "left-0" : "right-0"}`}
  >
    {direction === "prev" ? (
      <ArrowLeftIcon className="h-5 w-5 text-white" />
    ) : (
      <ArrowRightIcon className="h-5 w-5 text-white" />
    )}
  </button>
);

// Slider settings (desktop only; mobile/tablet uses a native scroll strip)
const settings = {
  dots: true,
  arrows: true,
  infinite: false, // no looping, so banners never wrap around and repeat
  speed: 500,
  slidesToShow: 2,
  slidesToScroll: 2,
  prevArrow: <Arrow direction="prev" />,
  nextArrow: <Arrow direction="next" />,
  appendDots: dots => (
    <div className="mt-6 flex justify-center items-center gap-2">
      {dots}
    </div>
  ),
  customPaging: () => (
    <div className="dot h-1 w-[25px] bg-[#44322B] rounded-full transition-all duration-300 mt-2" />
  ),
};

// Card content shared by the mobile scroll strip and the desktop slider
function DealCard({ deal, onNavigate }) {
  // Banner-style images: artwork on the left, text on the right. Everything scales with the
  // card width (container units), so nothing gets clipped at any screen size.
  if (deal.textRight) {
    const color = deal.dark ? "#2B1D17" : "#FFFFFF";
    const oldColor = deal.dark ? "#53443D" : "#F9F6F4";
    return (
      <div
        className="relative overflow-hidden rounded-[24px]"
        style={{ containerType: "inline-size", aspectRatio: "1484 / 645" }}
      >
        <img src={deal.img} alt={deal.title1} className="absolute inset-0 w-full h-full object-cover" />
        <div
          className="absolute inset-y-0 right-0 z-20 flex flex-col justify-center text-left overflow-hidden"
          style={{ width: "48%", paddingRight: "4cqw", color }}
        >
          <span className="font-heading leading-tight" style={{ fontSize: "clamp(11px, 4.4cqw, 27px)" }}>
            {deal.title1}
          </span>
          <p className="font-fancy leading-snug hidden sm:block" style={{ fontSize: "clamp(11px, 2.6cqw, 13px)", marginTop: "1cqw" }}>
            {deal.blurb}
          </p>
          <div className="flex flex-wrap items-center" style={{ gap: "2cqw", marginTop: "2cqw" }}>
            {deal.newPrice && <div className="grid">
              <span className="line-through font-normal font-fancy" style={{ color: oldColor, fontSize: "clamp(9px, 2.4cqw, 12px)" }}>
                {deal.oldPrice}
              </span>
              <span className="font-[700] font-fancy" style={{ fontSize: "clamp(11px, 3.2cqw, 16px)" }}>
                {deal.newPrice}
              </span>
            </div>}
            <button
              onClick={() => onNavigate(deal.dataurl)}
              className="text-[#13181F] font-fancy bg-[#C5A291] rounded-[24px]"
              style={{ fontSize: "clamp(10px, 2.8cqw, 14px)", padding: "1.2cqw 3.2cqw" }}
            >
              Add To Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <img src={deal.img} alt={deal.title1} className="w-full h-full object-cover" />
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
          background-color: #8C7367 !important;
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

          {/* Mobile/tablet: native horizontal scroll */}
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
