import React from "react";
import makeperfume from '../../assets/makeperfume.svg';
import { useNavigate } from "react-router-dom";
// bg-brand is the #e8d5cf tint you’ve been using.
// Add it once in tailwind.config.js if you haven’t yet:
// theme: { extend: { colors: { "bg-brand": "#e8d5cf" } } }
export default function OwnPerfume() {
  const Navigate = useNavigate();
  return (
    <section className="bg-bg-brand">
      <div className="w-[90%] lg:w-[80%] mx-auto py-16">
        {/* card wrapper */}
        <div className="mx-auto flex max-w-[960px] flex-col items-center gap-8 md:flex-row md:gap-10">
          {/* image */}
          <div className="shrink-0 w-full md:w-[440px] overflow-hidden rounded-2xl">
            <img
              src={makeperfume}
              alt="Perfumer crafting fragrance"
              className="w-full object-cover"
            />
          </div>

          {/* content */}
          <div className="flex flex-1 flex-col justify-center gap-4">
            <h2 className="font-heading text-3xl font-medium text-left text-[#7c706c] md:text-[34px]">
              Create Your Own <br/>Signature Perfume
            </h2>
            <p className="font-fancy max-w-prose text-[#7c706c] text-left">
              Design a custom luxury fragrance crafted exclusively for you. At Ikonix Perfumer, we blend premium ingredients, rare aroma notes, and expert craftsmanship to create a scent that reflects your personality. From fresh citrus accords to deep woody undertones, experience bespoke perfumery tailored to your style.
            </p>

            <button onClick={() => Navigate(`contact`)} className="font-fancy mt-2 w-max rounded-full bg-[#dab6a7] px-5 py-3 text-base font-medium text-[#44403c] transition hover:bg-[#e2c4b8]">
              Start Your Custom Fragrance
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
