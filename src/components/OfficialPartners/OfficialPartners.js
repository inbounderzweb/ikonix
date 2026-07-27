import React from "react";
import handshake from "../../assets/handshake.webp";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
    <path
      fill="#4285F4"
      d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"
    />
    <path
      fill="#34A853"
      d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"
    />
    <path
      fill="#FBBC05"
      d="M24 46c5.9 0 10.9-2 14.5-5.4l-6.7-5.5C29.8 36.7 27 37.8 24 37.8c-6.1 0-10.7-3.1-11.8-8.5l-7 5.4C8.7 41.1 15.8 46 24 46z"
    />
    <path
      fill="#EA4335"
      d="M44.5 20H24v8.5h11.8c-.8 2.5-2.4 4.7-4.6 6.3l6.7 5.5c3.9-3.6 6.1-9 6.1-15.3 0-1.3-.2-2.7-.5-4z"
    />
  </svg>
);

const MetaIcon = () => (
  <svg viewBox="0 0 56 28" className="w-14 h-7 md:w-16 md:h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 14C2 8.5 5.2 4 9.4 4C12.1 4 14.3 5.6 16.5 9L28 27L39.5 9C41.7 5.6 43.9 4 46.6 4C50.8 4 54 8.5 54 14C54 17.1 53.1 19.8 51.5 21.7C49.9 23.6 47.9 24.6 46.6 24.6C44.8 24.6 43.6 23.9 41.7 21.6L38.4 17.5L29.4 31.2C28.7 32.2 28 33 28 33C28 33 27.3 32.2 26.6 31.2L17.6 17.5L14.3 21.6C12.4 23.9 11.2 24.6 9.4 24.6C8.1 24.6 6.1 23.6 4.5 21.7C2.9 19.8 2 17.1 2 14Z"
      fill="url(#meta-gradient)"
    />
    <defs>
      <linearGradient id="meta-gradient" x1="2" y1="4" x2="54" y2="33" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0082FB" />
        <stop offset="1" stopColor="#00B2FF" />
      </linearGradient>
    </defs>
  </svg>
);

export default function OfficialPartners() {
  return (
    <section className="relative bg-[#0f0f0f] text-white overflow-hidden py-12 md:py-16 px-4">
      {/* Decorative background text */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 text-[100px] md:text-[160px] font-extrabold text-white/[0.04] leading-none select-none pointer-events-none whitespace-nowrap translate-x-10"
      >
        Google
        <br />
        Partner
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-2xl md:text-4xl font-bold tracking-wide mb-6 md:mb-10">
          We Are An Official
        </h2>

        {/* Flex column — mobile: title → handshake → logos; desktop: title → logos → handshake */}
        <div className="flex flex-col items-center">
          {/* Partner logos — order-2 on mobile, order-1 on desktop */}
          <div className="flex items-center justify-center gap-6 md:gap-14 order-2 md:order-1 mt-6 md:mt-0 md:mb-2">
            {/* Google Partner */}
            <div className="flex flex-col items-center gap-2">
              <GoogleIcon />
              <span className="text-sm md:text-base font-medium tracking-wide">
                Google Partner
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-16 md:h-20 bg-white/60 flex-shrink-0" />

            {/* Meta Business Partner */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <MetaIcon />
                <span className="text-3xl md:text-4xl font-bold text-[#0082FB] leading-none">
                  Meta
                </span>
              </div>
              <span className="text-sm md:text-base font-medium tracking-wide">
                Business Partner
              </span>
            </div>
          </div>

          {/* Handshake image — order-1 on mobile, order-2 on desktop */}
          <div className="w-full max-w-2xl mx-auto order-1 md:order-2">
            <img
              src={handshake}
              alt="Google and Meta Partnership"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto mt-6 md:mt-2 leading-relaxed">
          Inbounderz is officially recognised as a Google Partner and Meta Business
          Partner, showcasing our expertise in managing successful Google and Meta Ads
          campaigns. These badges confirm that we meet Google and Meta's high standards
          for performance, certification, and client spend.
        </p>
      </div>
    </section>
  );
}
