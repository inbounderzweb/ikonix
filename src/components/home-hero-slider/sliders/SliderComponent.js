import React from 'react';
import Slider from 'react-slick';
// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
// import firstBanner from '../../../assets/banner/firstBanner.svg';
import firstBanner from '../../../assets/banner/bannerDesk1.svg';
import secondBanner from '../../../assets/banner/bannerDesk2.svg';
import thirdbanner from '../../../assets/banner/bannerDesk3.svg';
import arrowleft from '../../../assets/Arrow-left.svg';
import arrowright from '../../../assets/Arrow-right.svg'
import { Link } from 'react-router-dom';
import CollectionCards from '../../collectioncards/CollectionCards';


const sliderData = [
  {
    title: 'Define\n Your Signature',
    subtitle: 'Discover timeless fragrances crafted to leave a lasting impression.',
    image: firstBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Awaken \n Your Senses',
    subtitle: 'Experience luxurious aromas designed to inspire every moment.',
    image: secondBanner,
    buttonText: 'View Products',
    buttonLink: '/shop',
  },
  {
    title: 'Indulge in \n Signature Scents',
    subtitle: 'Explore premium perfumes created to express your unique style.',
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
    <section className="w-[90%] lg:w-[80%] mx-auto md:mt-10 flex flex-col gap-5 mb-12">

      {/* Hero */}
      <div className="overflow-hidden rounded-[18px]">
        <Slider {...settings} className="hero-slider h-full w-full" >
          {sliderData.map((slide, index) => (
            <div key={index}>
              <div className="relative aspect-[1128/520] overflow-hidden rounded-[18px]">

                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 block h-full w-full object-cover object-center"
                />
                {/* <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" /> */}
                    <div className="absolute inset-0" />

                <div className="absolute inset-y-0 left-0 flex w-[48%] flex-col justify-center px-10 lg:px-16 text-[#53443D]">
                  <h1 className="font-heading text-[32px] lg:text-[54px] leading-[0.95] font-medium whitespace-pre-line">
                    {slide.title}
                  </h1>
                  <p className="font-fancy mt-3 max-w-[360px] text-[10px] lg:text-[16px] leading-relaxed text-[#53443D] whitespace-pre-line">
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.buttonLink}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded-3xl bg-[#2d3545] px-5 py-2 lg:px-10 lg:py-4 text-[14px] font-medium text-white transition-colors duration-300 hover:bg-[#1f2633]"
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
