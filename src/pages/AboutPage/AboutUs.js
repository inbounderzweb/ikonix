import React from 'react';
import shopherobg from '../../assets/about/about_banner.svg';
import shopherobgmob from '../../assets/about/BrandShowcaseBanner_mobile.svg';
import aboutmain from '../../assets/aboutmain.svg';
import mission from '../../assets/mission.svg';
import vision from '../../assets/vision.svg';
import ch1 from '../../assets/ch1.svg';
import ch2 from '../../assets/ch2.svg';
import ch3 from '../../assets/ch3.svg';
import ch4 from '../../assets/ch4.png';
import ch5 from '../../assets/ch5.svg';
import SpecialDealsSlider from '../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume from '../../components/ownperfume/OwnPerfume';

const whyChooseCards = [
  {
    icon: ch1,
    title: 'Personalised Fragrances',
    text: 'We create scents that are all about your preferences.',
  },
  {
    icon: ch2,
    title: 'Scent Recreation',
    text: 'We recreate popular favourites for you, making them more accessible without compromising on quality.',
  },
  {
    icon: ch3,
    title: 'High-Quality Ingredients',
    text: 'We use safe, premium ingredients that last long and are gentle on your skin.',
  },
  {
    icon: ch4,
    title: 'Affordable Pricing',
    text: 'We offer custom blends and recreated favourites at prices that make sense.',
  },
  {
    icon: ch5,
    title: 'Expert Craftsmanship',
    text: 'Our perfumers, with years of experience in the industry, ensure every fragrance is carefully balanced and thoughtfully made.',
  },
];

function AboutUs() {
  return (
    <div className="text-[#3b312e]">
      <section className="mx-auto mt-6 w-[90%] overflow-hidden rounded-2xl">
        <img
          src={shopherobg}
          alt="Ikonix about banner"
          className="hidden md:block w-full object-cover"
        />
        <img
          src={shopherobgmob}
          alt="Ikonix about banner mobile"
          className="block md:hidden w-full object-cover"
        />
      </section>

      <section className="mx-auto w-[90%] md:w-[75%] py-10 md:py-16 font-['Inter',sans-serif]">
        <div className="flex flex-col items-center gap-8 md:flex-row-reverse md:items-center md:gap-10">
          <div className="order-1 space-y-4 md:order-none md:w-1/2">
            <h2 className="text-center md:text-left text-2xl md:text-3xl font-semibold mt-2">
              Who We Are
            </h2>
            <p className="mx-auto max-w-[340px] text-center md:mx-0 md:max-w-none md:text-left text-[14px] leading-relaxed">
              Ikonix is built around one simple idea - scent should be personal. We specialise in
              creating custom fragrances that capture who you are and what you love. Whether you’re
              after something entirely unique or a budget-friendly recreation of a popular favourite,
              every Ikonix perfume is thoughtfully made with care.
            </p>
            <p className="mx-auto max-w-[340px] text-center md:mx-0 md:max-w-none md:text-left text-[14px] leading-relaxed">
              Our team of experienced perfumers blends quality ingredients with attention to detail,
              ensuring each fragrance isn’t just wearable but also memorable. At Ikonix, we don’t
              believe in one-scent-fits-all. We’re here to help you find a fragrance that truly feels
              like you.
            </p>
          </div>

          <div className="order-2 flex justify-center md:order-none md:w-1/2 md:justify-start">
            <img
              src={aboutmain}
              alt="Custom perfume illustration"
              className="w-full max-w-[320px] md:max-w-[520px] object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#EDE2DD] py-10 md:py-12">
        <div className="mx-auto grid w-[90%] md:w-[75%] grid-cols-1 gap-10 md:grid-cols-2 md:gap-10">
          <div className="flex flex-col items-center text-center gap-4 md:flex-row md:items-start md:text-left md:gap-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#d9cfc9]">
              <img src={mission} alt="Mission icon" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-[#8C7367] font-[Luxia]">
                Our Mission
              </h3>
              <p className="mx-auto max-w-[320px] leading-relaxed font-[Lato] text-[15px] md:text-[16px] font-[400] text-[#53443D] md:mx-0 md:max-w-none">
                To create high-quality, personalised fragrances that express individual style,
                evoke emotion, and make luxury scent experiences accessible to everyone.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-4 md:flex-row md:items-start md:text-left md:gap-5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#d9cfc9]">
              <img src={vision} alt="Vision icon" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-semibold text-[#8C7367] font-[Luxia]">
                Our Vision
              </h3>
              <p className="mx-auto max-w-[320px] leading-relaxed font-[Lato] text-[15px] md:text-[16px] font-[400] text-[#53443D] md:mx-0 md:max-w-none">
                To become a trusted name in custom perfumery by changing the way people connect with
                fragrance through creativity, affordability, and thoughtful craftsmanship.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-[90%] md:w-[75%] py-12 md:py-16">
        <h2 className="mb-10 text-center text-2xl md:text-3xl text-[#B39384] font-[luxia]">
          Why Choose Us
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
          {whyChooseCards.map((card, index) => (
            <div
              key={card.title}
              className={`flex flex-col items-center text-center rounded-2xl bg-[#f5ece8] p-6 md:p-8 space-y-4 h-full ${
                index < 3
                  ? 'lg:col-span-2'
                  : index === 3
                    ? 'lg:col-span-2 lg:col-start-2'
                    : 'lg:col-span-2 lg:col-start-4'
              }`}
            >
              <img src={card.icon} alt={card.title} className="w-20 md:w-24 object-contain" />
              <h4 className="font-[Lato] font-[700] text-[18px] md:text-[21px] text-[#53443D]">
                {card.title}
              </h4>
              <p className="font-[Lato] text-[14px] md:text-[16px] font-[400] text-[#53443D]">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <SpecialDealsSlider />
      <OwnPerfume />
    </div>
  );
}

export default AboutUs;
