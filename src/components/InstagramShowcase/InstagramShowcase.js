// InstagramShowcase.jsx – v6: 75% layout, carousel flush right edge
// Prereqs: npm i react-slick slick-carousel
// Global styles (index.css / _app.js):
//   import "slick-carousel/slick/slick.css";
//   import "slick-carousel/slick/slick-theme.css";

import React from "react";
import Slider from "react-slick";
import { HiOutlineArrowRight, HiOutlineArrowLeft } from "react-icons/hi";

import instapage from "../../assets/instapage.svg";
import post1 from "../../assets/post1.svg";
import post2 from "../../assets/post2.svg";
import post3 from "../../assets/post3.svg";

const CARDS = [
  { id: 1, img: post1, title: "The Haze Of Desire" },
  { id: 2, img: post2, title: "Mystery In Every Mist" },
  { id: 3, img: post3, title: "A Fragrance Forged in Fire" },
];

/* ───────── Custom arrow component ───────── */
const Arrow = ({ direction, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/40 backdrop-blur-md transition hover:bg-white/70 ${
      direction === "prev" ? "left-0 hidden" : "right-0"
    }`}
  >
    {direction === "prev" ? (
      <HiOutlineArrowLeft className="h-6 w-6 text-[#c7a895] hidden" />
    ) : (
      <HiOutlineArrowRight className="h-6 w-6 text-[#c7a895]" />
    )}
  </button>
);

/* ───────── Slick settings ───────── */
const settings = {
  dots: false,
  arrows: true,
  infinite: true,
  speed: 600,
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: false,
  prevArrow: <Arrow direction="prev" />,
  nextArrow: <Arrow direction="next" />,
  responsive: [
    {
      breakpoint: 1024,
      settings: { slidesToShow: 1 },
    },
  ],
};

export default function InstagramShowcase() {
  return (
    <section className="bg-gradient-to-b from-[#c7a895] to-white py-10 w-full">
      {/*
        Wrapper width capped at 75% of viewport (`w-[75%]`) and pushed flush to the
        right with `ml-auto`, so the carousel kisses the screen edge while the
        phone mock‑up sits just to its left.
      */}
      <div className="ml-auto flex w-[90%] flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Left ─ Instagram profile preview */}
        <img
          src={instapage}
          alt="Instagram page preview"
          className="mx-auto w-full max-w-sm object-contain md:mx-0"
        />

        {/* Right ─ Carousel flush‑right */}
        <div className="relative ml-auto w-full overflow-hidden md:flex-1 md:pl-4">
          <Slider {...settings}>
            {CARDS.map(({ id, img, title }) => (
              <div key={id} className="px-2">
                <img
                  src={img}
                  alt={title}
                  className="w-full rounded-2xl object-cover shadow-lg"
                />
              </div>
            ))}
          </Slider>

          {/* Wider, softer right‑edge gradient overlay */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent" />

          <div className="mt-5 flex gap-8 items-center">

            <div className="grid">
              <span className="text-[B39384] font-normal text-[16px] font-[luxia] text-left">Check us out on</span>
              <span className="text-[B39384] font-semibold text-[24px] font-[luxia]">Instagram</span>
            </div>

            <div>
                <button className="bg-[#C5A291] px-[24px] py-[8px] rounded-[24px]">Click here</button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
