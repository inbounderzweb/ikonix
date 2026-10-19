// src/lib/metaPixel.js
// Safe wrapper around the Meta Pixel (base snippet lives in public/index.html).
// An ad blocker or a failed fbevents.js load leaves window.fbq undefined (or
// a queue-only stub), so every call is guarded and can never throw.

export function trackMetaPageView() {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.fbq === "function") window.fbq("track", "PageView");
  } catch (err) {
    console.error("Meta Pixel PageView failed:", err);
  }
}
