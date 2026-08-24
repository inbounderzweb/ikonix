// src/hooks/useDocumentTitle.js
// Sets document.title synchronously during render (not inside a useEffect).
// This matters for analytics accuracy: usePageViewTracking.js reads
// document.title inside its own effect right after a route change, and
// <PageViewTracker /> is mounted before <AppRoutes /> in App.js, so its
// effect can run before a page's title-effect would. Setting the title
// during render instead guarantees it's already correct by the time any
// effect (including the tracking one) runs — no dependency on effect order.
import { useRef } from "react";

const SITE_NAME = "Ikonix Perfumer";

export default function useDocumentTitle(title) {
  const full = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Custom & Long-Lasting Luxury Perfumes Online`;
  const lastSet = useRef(null);
  if (typeof document !== "undefined" && lastSet.current !== full) {
    document.title = full;
    lastSet.current = full;
  }
}
