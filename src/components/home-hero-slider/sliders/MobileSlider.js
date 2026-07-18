import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import mobilefirstBanner from "../../../assets/banner/bannerMob1.svg";
import mobilesecondBanner from "../../../assets/banner/bannerMob2.svg";
import { Link } from "react-router-dom";
import CollectionCards from "../../collectioncards/CollectionCards";

const sliderData = [
  {
    title: "Define Your Signature",
    subtitle:
      "Discover timeless fragrances crafted to leave a lasting impression.",
    image: mobilefirstBanner,
    buttonText: "View Products",
    buttonLink: '/shop',
  },
  {
    title: "Awaken Your Senses",
    subtitle:
      "Experience luxurious aromas designed to inspire every moment.",
    image: mobilesecondBanner,
    buttonText: "View Products",
    buttonLink: '/shop',
  },
  // {
  //   title: "Define Your Signature",
  //   subtitle:
  //     "Elevate every moment with an unforgettable scent.",
  //   image: mobilethirdBanner,
  //   buttonText: "View Products",
  //   buttonLink: '/shop',
  // },
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
    <section className="w-full mt-3">
      <div className="mobile-slider w-[90%] lg:w-[80%] mx-auto relative overflow-hidden rounded-[6px]">
        <Slider {...settings}>
          {sliderData.map((slide, idx) => (
            <div key={idx} className="relative overflow-hidden rounded-[6px]">
              <img
                src={slide.image}
                alt={`Slide ${idx + 1}`}
                className="block w-full h-auto rounded-[6px]"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/25 to-black/60" />

              {/* gradient overlay + contents */}
              <div className="absolute inset-0 flex flex-col justify-between items-center text-center px-4 pt-8 pb-10">
                <div>
                  <h2 className="font-heading text-[24px] leading-tight font-semibold mb-3 bg-gradient-to-r from-[#FFF8F1] via-[#E9C9B2] to-[#FFF0DE] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
                    {slide.title}
                  </h2>
                  <p className="font-fancy text-[#F3E4D6] text-sm leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.22)]">
                    {slide.subtitle}
                  </p>
                </div>
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
      <div className="mt-3">
        <CollectionCards />
      </div>
    </section>
  );
};

export default MobileSlider;
