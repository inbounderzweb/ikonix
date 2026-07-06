import React from 'react';
import Slider from 'react-slick';
// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import firstBanner from '../../../assets/firstBanner.jpg';
import secondBanner from '../../../assets/secondBanner.jpg';
import thirdbanner from '../../../assets/thirdBanner.jpg';
import arrowleft from '../../../assets/Arrow-left.svg';
import arrowright from '../../../assets/Arrow-right.svg'
import { Link } from 'react-router-dom';
import CollectionCards from '../../collectioncards/CollectionCards';


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
    <div className="w-[95%] max-w-[1700px] mx-auto mt-5 h-[82vh] flex flex-col items-center gap-4">

      {/* Hero */}
      <div className="flex-[4] flex-wrap rounded-[28px] h-[50%] bg-red-800 w-[95%]">
        <Slider {...settings} className="hero-slider h-full w-full bg-green-400" >
          {sliderData.map((slide, index) => (
            <div key={index} className="bg-yellow-400 w-f h-full">
              <div className="relative h-[50%] rounded-[28px] bg-yellow-400 flex">

                {/* <img
              src={slide.image}
              className="w-full h-full object-fill"
            /> */}
                {/* <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-contain object-center"
                /> */}

                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

                
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Collections */}
      <div className="flex-[1] justify-evenly w-[95%] h-[30%]">
        <CollectionCards />
      </div>

    </div>
  );
};

export default SliderComponent;
