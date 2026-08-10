// src/hooks/usePageViewTracking.js
// Fires one custom `page_view` dataLayer event per SPA route change.
//
// IMPORTANT (GTM-side requirement, can't be done from this codebase): the
// GA4 Configuration tag's built-in "Send a page view event when this
// configuration loads" must be turned OFF in GTM, and a GA4 Event tag with
// Event Name = "page_view" wired to a Custom Event trigger on this event
// used instead. Otherwise GTM's own history-change listener and this hook
// would both fire a page view, duplicating it (react-router doesn't do a
// full navigation/reload, so GTM's automatic page_view never sees route
// changes on its own anyway — this hook is what makes SPA navigation
// visible to GA4 at all).
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { pushToDataLayer } from "../lib/gtm";

export default function usePageViewTracking() {
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return; // skip re-renders on the same route
    lastPath.current = path;

    pushToDataLayer({
      event: "page_view",
      page_location: window.location.href,
      page_path: path,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);
}
