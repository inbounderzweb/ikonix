import React from 'react';
import Slider from 'react-slick';
// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import firstBanner from '../../../assets/firstBanner.jpg';
import secondBanner from '../../../assets/secondBanner.jpg';
import thirdbanner from '../../../assets/thirdBanner.jpg';
import arrowleft from '../../../assets/Arrow-left.svg';
import arrowright from '../../../assets/Arrow-right.svg'
import { Link } from 'react-router-dom';


const sliderData = [
  {
    title: 'Indulge in Signature Scents',
    subtitle: 'Discover handcrafted fragrances that captivate the senses and define your presence.',
    image: firstBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Awaken Your Senses',
    subtitle: 'Where luxury meets emotion — find your perfect scent.',
    image: secondBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Define Your Signature',
    subtitle: 'Elevate every moment with an unforgettable scent.',
    image: thirdbanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
];

// Custom arrow components
const PrevArrow = ({ onClick }) => (
  <div
    onClick={onClick}
    className="absolute bottom-4 right-16 z-10 cursor-pointer"
  >
    <img src={arrowleft} alt='arrow-left' />
    {/* <ChevronLeftIcon className="text-white w-6 h-6" /> */}
  </div>
);

const NextArrow = ({ onClick }) => (
  <div
    onClick={onClick}
    className="absolute bottom-4 right-4 z-10 cursor-pointer"
  >
    <img src={arrowright} alt='arrow-right' />
    {/* <ChevronRightIcon className="text-white w-6 h-6" /> */}
  </div>
);

const SliderComponent = () => {
  const settings = {
    dots: false, // remove navigation dots
    infinite: true,
    speed: 500,
    fade: true, // 🔥 fade effect instead of slide
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
  };


  return (
    <div className="relative w-[95%] mx-auto mt-[20px]">
      <Slider {...settings}>
        {sliderData.map((slide, index) => (
          <div key={index} className="relative overflow-hidden rounded-[28px]">
            <img
              src={slide.image}
              alt={`Product ${index + 1}`}
              className="w-full object-cover object-[center_55%] bg-center rounded-[28px] h-[540px]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
            <div className="absolute top-1/2 -translate-y-1/2 text-left text-white pl-[52px] lg:pl-[72px] xl:pl-[90px] w-[470px] lg:w-[520px]">
              <h2 className="font-sans mb-[10px] text-[20px] lg:text-[42px] xl:text-[64px] leading-[0.95] bg-gradient-to-r from-[#FFFDF9] via-[#EFD2BF] to-[#F3D8C7] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                {slide.title}
              </h2>
              <p className="font-fancy text-[16px] font-normal mb-[18px] text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.18)]">
                {slide.subtitle}
              </p>
              <Link
                to={slide.buttonLink}
                className="inline-block cursor-pointer bg-[#2f3a4e] text-white py-3 px-9 rounded-full font-fancy text-[16px] tracking-wide font-medium hover:bg-[#243043]"
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

export default SliderComponent;
