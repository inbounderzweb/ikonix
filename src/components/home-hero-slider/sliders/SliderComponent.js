import React from 'react';
import Slider from 'react-slick';
// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import firstBanner from '../../../assets/firstBanner.svg';
import secondBanner from '../../../assets/secondBanner.svg';
import thirdbanner from '../../../assets/thirdBanner.svg';
import arrowleft from '../../../assets/Arrow-left.svg';
import arrowright from '../../../assets/Arrow-right.svg'
import { Link } from 'react-router-dom';


const sliderData = [
  {
    title: 'Lorem ipsum dolor',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ipsum dolor sit amet, consectetur adipiscing.',
    image: firstBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Lorem ipsum dolo',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ipsum dolor sit amet, consectetur adipiscing.',
    image: secondBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Lorem ipsum dolo',
    subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, ipsum dolor sit amet, consectetur adipiscing.',
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
    <div className="relative w-[95%] lg:w-[75%] mx-auto">
      <Slider {...settings}>
        {sliderData.map((slide, index) => (
          <div key={index} className="relative overflow-hidden">
            <img
              src={slide.image}
              alt={`Product ${index + 1}`}
              className="w-full object-cover bg-center"
            />
            <div className="absolute top-1/2 transform -translate-y-1/2 text-left text-white pl-[40px] lg:pl-[60px] xl:pl-[90px] w-[450px]">
              <h2 className="font-sans mb-[8px] text-[20px] lg:text-[40px] xl:text-[61px] text-base-[96%]">{slide.title}</h2>
              <p className="font-fancy text-[16px] font-normal mb-[16px]">{slide.subtitle}</p>
              <Link
                to={slide.buttonLink}
                className="inline-block cursor-pointer bg-[#2A3443] text-white py-3 px-8 rounded-full font-fancy text-[16px] tracking-wide font-medium hover:bg-[#1c2733]"
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
