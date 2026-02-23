import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import mobilefirstBanner  from "../../../assets/mobilefirst.svg";
import mobilesecondBanner from "../../../assets/mobilesecond.svg";
import mobilethirdBanner  from "../../../assets/mobilethird.svg";
import { Link } from "react-router-dom";

const sliderData = [
  {
    title: "Lorem ipsum dolor sit amet",
    subtitle:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, ipsum dolor sit amet, consectetuer adipiscing",
    image: mobilefirstBanner,
    buttonText: "View Products",
   buttonLink: '/shop',
  },
  {
    title: "Lorem ipsum dolor sit amet",
    subtitle:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, ipsum dolor sit amet, consectetuer adipiscing",
    image: mobilesecondBanner,
    buttonText: "View Products",
    buttonLink: '/shop',
  },
  {
    title: "Lorem ipsum dolor sit amet",
    subtitle:
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, ipsum dolor sit amet, consectetuer adipiscing",
    image: mobilethirdBanner,
    buttonText: "View Products",
    buttonLink: '/shop',
  },
];

const MobileSlider = () => {
  const settings = {
    dots: true,            // ← keep Slick’s default round dots
    infinite: true,
    speed: 400,
    fade: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: false,
  };

  return (
    <div className="mobile-slider w-full max-w-[95%] mt-3 mx-auto relative overflow-hidden">
      <Slider {...settings}>
        {sliderData.map((slide, idx) => (
          <div key={idx} className="relative">
            <img
              src={slide.image}
              alt={`Slide ${idx + 1}`}
              className="w-full h-auto object-cover"
            />

            {/* gradient overlay + contents */}
            <div className="absolute inset-0 flex flex-col justify-end items-center text-center px-4 pb-10 bg-gradient-to-t from-[#00000080] via-transparent">
              <h2 className="text-white text-[24px] leading-tight font-semibold mb-3">
                {slide.title}
              </h2>
              <p className="text-white text-sm leading-relaxed mb-5">
                {slide.subtitle}
              </p>
              <Link
                to={slide.buttonLink}
                className="bg-[#E2C4AD] cursor-pointer text-black text-base px-6 py-2 rounded-xl font-medium hover:bg-[#d5b49b] transition-all duration-300"
              >
                {slide.buttonText}
              </Link>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default MobileSlider;
