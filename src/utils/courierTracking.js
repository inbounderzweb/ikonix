// src/utils/courierTracking.js
// Confirmed courier partners (from the admin panel's "Courier Partner"
// selector): India Post, DTDC, Professional Courier, Delhivery, ECOM
// Express. Each has its own public tracking page; only Delhivery and ECOM
// Express have a well-known, reliable deep-link query param that prefills
// the tracking number — the other three's URL formats change over time and
// aren't fully confirmed, so they fall back to the courier's general
// tracking page (the ID is still shown for the user to paste in manually).
const COURIERS = [
  {
    match: /delhivery/i,
    name: 'Delhivery',
    url: (id) => `https://www.delhivery.com/track-v2/package/${encodeURIComponent(id)}`,
  },
  {
    match: /ecom\s*express/i,
    name: 'ECOM Express',
    url: (id) => `https://ecomexpress.in/tracking/?awb_field=${encodeURIComponent(id)}`,
  },
  {
    match: /dtdc/i,
    name: 'DTDC',
    // DTDC's deep-link query param has changed before — verify this still
    // prefills correctly; falls back gracefully to their tracking page either way.
    url: (id) => `https://www.dtdc.in/trace.asp?strCnno=${encodeURIComponent(id)}`,
  },
  {
    match: /professional\s*courier|\btpc\b/i,
    name: 'Professional Courier',
    url: () => `https://www.tpcindia.com/track.php`,
  },
  {
    match: /india\s*post/i,
    name: 'India Post',
    url: () => `https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx`,
  },
];

// Pulls a tracking id / courier name out of an order using several
// plausible backend field names, since the exact shape hasn't been
// confirmed against a real "shipped with courier" order yet.
export function getCourierInfo(order) {
  const trackingId =
    order?.trackno ??
    order?.tracking_id ??
    order?.trackingid ??
    order?.tracking_no ??
    order?.tracking_number ??
    order?.awb ??
    order?.awb_no ??
    order?.awb_number ??
    order?.consignment_no ??
    order?.consignmentno ??
    order?.docket_no ??
    order?.docket_number ??
    null;

  const courierRaw =
    order?.courier ??
    order?.courier_partner ??
    order?.courierpartner ??
    order?.courier_name ??
    order?.carrier ??
    order?.shipping_partner ??
    null;

  if (!trackingId) return null;

  const id = String(trackingId).trim();
  if (!id) return null;

  const courierName = courierRaw ? String(courierRaw).trim() : '';
  const known = COURIERS.find((c) => c.match.test(courierName));

  return {
    trackingId: id,
    courierName: known?.name || courierName || 'Courier',
    trackingUrl: known ? known.url(id) : null,
  };
}
