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
    className="absolute bottom-5 right-16 z-10 cursor-pointer"
  >
    <img src={arrowleft} alt='arrow-left' />
    {/* <ChevronLeftIcon className="text-white w-6 h-6" /> */}
  </div>
);

const NextArrow = ({ onClick }) => (
  <div
    onClick={onClick}
    className="absolute bottom-5 right-5 z-10 cursor-pointer"
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
    <section className="w-[90%] max-w-[1128px] mx-auto mt-5 flex flex-col gap-5 bg-yellow-300">

      {/* Hero */}
      <div className="overflow-hidden rounded-[18px]">
        <Slider {...settings} className="hero-slider h-full w-full" >
          {sliderData.map((slide, index) => (
            <div key={index}>
              <div className="relative overflow-hidden rounded-[18px]">

                <img
                  src={slide.image}
                  alt={slide.title}
                  className="block w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />

                <div className="absolute inset-y-0 left-0 flex w-[48%] flex-col justify-center px-10 lg:px-16 text-white">
                  <h1 className="font-serif text-[32px] lg:text-[44px] leading-[0.95] font-medium">
                    {slide.title}
                  </h1>
                  <p className="mt-3 max-w-[360px] text-[10px] lg:text-[13px] leading-relaxed text-white/90">
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.buttonLink}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded-[6px] bg-[#2d3545] px-5 py-2 text-[11px] font-medium text-white transition-colors duration-300 hover:bg-[#1f2633]"
                  >
                    {slide.buttonText}
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Collections */}
      <div>
        <CollectionCards />
      </div>

    </section>
  );
};

export default SliderComponent;
