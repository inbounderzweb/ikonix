import React from 'react';
import shopherobg from '../../assets/about/aboutBannerDesk.svg';
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
import useDocumentTitle from '../../hooks/useDocumentTitle';

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
  useDocumentTitle("About Us");
  return (
    <div className="text-[#3b312e]">
      <section className="relative mx-auto mt-5 md:mt-10 w-[90%] lg:w-[80%] overflow-hidden rounded-2xl">
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
        <h2 className="absolute z-10 hidden md:block font-[Luxia] text-[#53443D] leading-snug text-left md:top-1/2 md:right-[18%] md:-translate-y-1/2 md:text-3xl lg:text-4xl">
          About Us
        </h2>
      </section>

      <section className="mx-auto w-[90%] lg:w-[80%] py-10 md:py-16 font-[Lato]">
        <div className="flex flex-col items-center gap-8 md:flex-row-reverse md:items-center md:justify-center md:gap-10">
          <div className="order-1 space-y-4 md:order-none md:max-w-[560px]">
            <h2 className="text-center md:text-left text-2xl md:text-3xl font-[Luxia] text-[#8C7367] mt-2">
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

          <div className="order-2 flex justify-center md:order-none md:shrink-0">
            <img
              src={aboutmain}
              alt="Custom perfume illustration"
              className="w-full max-w-[320px] md:max-w-[520px] object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#EDE2DD] py-10 md:py-14">
        <div className="mx-auto flex w-[90%] lg:w-[80%] flex-col items-center gap-10 md:flex-row md:items-start md:justify-center md:gap-16 lg:gap-24">
          {[
            {
              icon: mission,
              alt: 'Mission icon',
              title: 'Our Mission',
              text: 'To create high-quality, personalised fragrances that express individual style, evoke emotion, and make luxury scent experiences accessible to everyone.',
            },
            {
              icon: vision,
              alt: 'Vision icon',
              title: 'Our Vision',
              text: 'To become a trusted name in custom perfumery by changing the way people connect with fragrance through creativity, affordability, and thoughtful craftsmanship.',
            },
          ].map(({ icon, alt, title, text }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center gap-4 md:flex-row md:items-center md:text-left md:gap-5"
            >
              <div className="flex h-[70px] w-[70px] md:h-16 md:w-16 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <img src={icon} alt={alt} className="h-9 w-9 md:h-8 md:w-8 object-contain" />
              </div>
              <div>
                <h3 className="mb-1 text-[22px] md:text-xl font-[Luxia] text-[#8C7367]">
                  {title}
                </h3>
                <p className="mx-auto max-w-[300px] md:mx-0 md:max-w-[380px] font-[Lato] text-[13px] md:text-[14px] leading-relaxed text-[#53443D]">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-[90%] lg:w-[80%] py-12 md:py-16">
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
