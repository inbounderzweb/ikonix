import React from 'react';

const MESSAGE = 'EXCLUSIVE OFFERS AVAILABLE ONLY TO LOGGED-IN USERS. LOG IN NOW TO UNLOCK!';
// Repeated so each half is wider than the screen and the loop never shows a gap.
const OFFERS = Array.from({ length: 4 }, () => MESSAGE);

// Two identical halves, translated by -50%, give a seamless loop.
const OfferMarquee = () => (
  <div
    className="group w-full overflow-hidden bg-[#2d3545] py-2 md:py-2.5 text-white"
    role="region"
    aria-label="Current offers"
  >
    <style>{`
      @keyframes offer-marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .offer-marquee-track { animation: offer-marquee 25s linear infinite; }
      @media (min-width: 768px) { .offer-marquee-track { animation-duration: 35s; } }
      .group:hover .offer-marquee-track { animation-play-state: paused; }
      @media (prefers-reduced-motion: reduce) { .offer-marquee-track { animation: none; } }
    `}</style>
    <div className="offer-marquee-track flex w-max whitespace-nowrap">
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
          {OFFERS.map((text, i) => (
            <span
              key={i}
              className="font-fancy mx-6 md:mx-10 text-[12px] md:text-[14px] font-medium tracking-wide"
            >
              {text}
              <span className="ml-6 md:ml-10 text-[#DDB849]">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default OfferMarquee;
