// src/lib/gtm.js
// Single, centralized entry point for pushing events onto the GTM dataLayer.
// The GTM base snippet itself lives in public/index.html (container
// GTM-5RG2C86K) and initializes window.dataLayer — this module never
// touches gtag()/GA4 directly, keeping the architecture to exactly one path:
// Website -> dataLayer -> GTM -> GA4.
//
// Every push goes through here so a broken/missing dataLayer (e.g. an ad
// blocker, or GTM failing to load) can never throw and break the app —
// analytics must be non-blocking.

export function pushToDataLayer(eventData) {
  if (typeof window === "undefined") return; // SSR / non-browser safety
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventData);
  } catch (err) {
    // Never let analytics take down the app.
    console.error("dataLayer push failed:", err);
  }
}

// GA4/GTM best practice: clear the previous event's `ecommerce` object
// before pushing a new one, so items from one event don't leak into the
// next (a well-documented GTM gotcha with nested ecommerce objects).
export function resetEcommerce() {
  pushToDataLayer({ ecommerce: null });
}
