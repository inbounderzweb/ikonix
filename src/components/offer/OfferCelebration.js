// src/components/offer/OfferCelebration.js
import React, { useEffect, useMemo, useRef, useState } from "react";

const COLORS = ["#C5A291", "#8C7367", "#F2C94C", "#E76F51", "#2A9D8F", "#4C6EF5", "#F783AC"];
const PIECES = 36;
const BURST_MS = 2600;

// Small confetti burst + banner shown when the cart qualifies for an offer
// (e.g. "Buy 4 Get 1 Free"). The burst fires each time the free quantity goes up,
// not on every re-render, and is skipped for users who prefer reduced motion.
export default function OfferCelebration({ freeItems = [], className = "" }) {
  const freeQty = freeItems.reduce((s, f) => s + (Number(f.free_qty) || 0), 0);
  const saved = freeItems.reduce((s, f) => s + (Number(f.discount) || 0), 0);

  const prevQty = useRef(freeQty);
  const [burst, setBurst] = useState(0); // 0 = no burst running

  useEffect(() => {
    if (freeQty > prevQty.current) {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) {
        setBurst((b) => b + 1);
        const t = setTimeout(() => setBurst(0), BURST_MS);
        prevQty.current = freeQty;
        return () => clearTimeout(t);
      }
    }
    prevQty.current = freeQty;
  }, [freeQty]);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: 5 + Math.random() * 90, // vw-ish % of the container
        drift: (Math.random() - 0.5) * 160, // px sideways
        rot: 360 + Math.random() * 540,
        delay: Math.random() * 0.35,
        dur: 1.6 + Math.random() * 0.9,
        size: 6 + Math.random() * 6,
        round: i % 3 === 0,
        color: COLORS[i % COLORS.length],
      })),
    // new random layout per burst
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );

  if (freeQty <= 0) return null;

  return (
    <>
      <style>{`
        @keyframes ikx-confetti-fall {
          0%   { transform: translate3d(0,-10vh,0) rotate(0); opacity: 1; }
          100% { transform: translate3d(var(--drift),95vh,0) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes ikx-offer-pop {
          0% { transform: scale(.94); opacity: 0; }
          60% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ikx-offer-banner { animation: none !important; }
        }
      `}</style>

      {burst > 0 && (
        <div
          key={burst}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[200] overflow-hidden"
        >
          {pieces.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: `${p.left}%`,
                width: p.size,
                height: p.round ? p.size : p.size * 0.5,
                borderRadius: p.round ? "50%" : 2,
                background: p.color,
                "--drift": `${p.drift}px`,
                "--rot": `${p.rot}deg`,
                animation: `ikx-confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      <div
        role="status"
        className={`ikx-offer-banner flex items-center gap-3 rounded-xl border border-[#C5A291] bg-[#F9F1EC] px-4 py-3 text-[#53443D] ${className}`}
        style={{ animation: "ikx-offer-pop .5s ease-out" }}
      >
        <span className="text-2xl" aria-hidden="true">🎉</span>
        <div className="text-sm leading-snug">
          <p className="font-semibold">
            Offer unlocked! {freeQty} bottle{freeQty > 1 ? "s" : ""} free
          </p>
          <p className="text-[#8C7367]">You save Rs.{saved.toFixed(2)}/- on this order</p>
        </div>
      </div>
    </>
  );
}
