import { useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 768; // matches Tailwind's `md` breakpoint used across the app
const SCROLL_THRESHOLD = 8;    // px of movement required before direction flips (anti-flicker)
const TOP_OFFSET = 24;         // px from top still considered "at the top"

/**
 * Drives the mobile-only auto-hide navbar/footer behaviour from a single
 * rAF-throttled scroll listener, shared by Header and MobileBottomNav so
 * only one listener exists regardless of how many consumers read it.
 */
export default function useMobileNavScroll() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  );
  const [navVisible, setNavVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);

  const lastY = useRef(typeof window !== "undefined" ? window.scrollY : 0);
  const ticking = useRef(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      // desktop/tablet: keep navbar visible, footer hidden, no listener needed
      setNavVisible(true);
      setFooterVisible(false);
      return;
    }

    lastY.current = window.scrollY;

    const update = () => {
      const currentY = Math.max(window.scrollY, 0);
      const delta = currentY - lastY.current;

      if (currentY <= TOP_OFFSET) {
        setNavVisible(true);
        setFooterVisible(false);
      } else if (Math.abs(delta) > SCROLL_THRESHOLD) {
        if (delta > 0) {
          // scrolling down
          setNavVisible(false);
          setFooterVisible(true);
        } else {
          // scrolling up
          setNavVisible(true);
          setFooterVisible(false);
        }
        lastY.current = currentY;
      }

      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  return { isMobile, navVisible, footerVisible };
}
