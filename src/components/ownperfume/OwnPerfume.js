import React from "react";
import makeperfume from '../../assets/makeperfume.svg'
// bg-brand is the #e8d5cf tint you’ve been using.
// Add it once in tailwind.config.js if you haven’t yet:
// theme: { extend: { colors: { "bg-brand": "#e8d5cf" } } }
export default function OwnPerfume() {
  return (
    <section className="bg-bg-brand">
      <div className=" w-[75%] mx-auto px-4 py-16">
        {/* card wrapper */}
        <div className="flex flex-col overflow-hidden rounded-[24px] bg-white/10 backdrop-blur-md md:flex-row">
          {/* image */}
          <div className="shrink-0 md:w-5/12">
            <img
              src={makeperfume} // ⬅️ replace with your image
              alt="Perfumer crafting fragrance"
            
            />
          </div>

          {/* content */}
          <div className="flex flex-1 flex-col justify-center gap-6 p-8 md:p-14">
            <h2 className="text-3xl font-medium text-left text-[#7c706c] md:text-4xl">
              Create your own perfume
            </h2>
            <p className="max-w-prose text-[#7c706c] text-left">
              Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
              diam nonummy nibh euismod tincidunt ut laoreet dolore magna
              aliquam.
            </p>

            <button className="mt-2 w-max rounded-full bg-[#dab6a7] px-8 py-3 text-base font-medium text-[#44403c] transition hover:bg-[#e2c4b8]">
              Reach out now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
