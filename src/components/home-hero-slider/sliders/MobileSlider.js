import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import mobilefirstBanner from "../../../assets/banner/bannerMob1.svg";
import mobilesecondBanner from "../../../assets/banner/bannerMob2.svg";
import mobilefourthBanner from "../../../assets/banner/bannerMob4.svg";
import { Link } from "react-router-dom";
import CollectionCards from "../../collectioncards/CollectionCards";

const sliderData = [
  {
  title: "Stock Up on Your Favorites",
  subtitle:
    "Discover your signature scents and bring home the fragrances you love, every day.",
  image: mobilefourthBanner,
  buttonText: "Shop Now",
  buttonLink: "/shop",
  // banner artwork already contains the headline and has a light blue background
  light: true,
},
  {
    title: "Define Your Signature",
    subtitle:
      "Discover timeless fragrances \n crafted to leave a lasting impression.",
    image: mobilefirstBanner,
    buttonText: "View Products",
    buttonLink: '/shop',
  },
  {
    title: "Awaken Your Senses",
    subtitle:
      "Experience luxurious aromas \n designed to inspire every moment.",
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
    <section className="w-full mt-6 md:mt-3">
      <div className="mobile-slider w-[90%] lg:w-[80%] mx-auto relative overflow-hidden rounded-[6px]">
        <Slider {...settings}>
          {sliderData.map((slide, idx) => (
            <div key={idx} className="relative overflow-hidden rounded-[6px]">
              <img
                src={slide.image}
                alt={`Slide ${idx + 1}`}
                className="block w-full h-[75svh] object-cover rounded-[6px]"
              />

              {/* contents */}
              <div className="absolute inset-0 flex flex-col justify-between items-center text-center px-4 pt-12 pb-10">
                <div className={slide.light ? "invisible" : ""}>
                  <h2 className="font-heading text-[22px] sm:text-[28px] leading-tight font-semibold mb-3 text-[#2F3A4A]">
                    {slide.title}
                  </h2>
                  <p className="font-fancy whitespace-pre-line text-[#2F3A4A] text-[13px] sm:text-base leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>
                <Link
                  to={slide.buttonLink}
                  className={`cursor-pointer text-base px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                    "bg-[#2F3A4A] text-white hover:bg-[#4A6FB5]"
                  }`}
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
