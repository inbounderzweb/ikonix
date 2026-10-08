const amount = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const money = (value) => {
  if (!Number.isFinite(value) || value < 0) return 0;
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
};

const positiveAmount = (value) => {
  const parsed = amount(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const pickBestPrice = (item) => {
  const candidates = [
    item.sale_price,
    item.selling_price,
    item.offer_price,
    item.discount_price,
    item.final_price,
    item.unit_price,
    item.price,
  ];
  for (const candidate of candidates) {
    const price = positiveAmount(candidate);
    if (price !== null) return money(price);
  }
  return 0;
};

// Keep the normal cart price separately from any active free-item offer.
export const normalizeServerCartItem = (item) => ({
  cartid: item.cartid ?? item.id,
  id: Number(item.productid ?? item.id),
  variantid: String(item.variantid ?? item.vid ?? ''),
  name: item.name,
  image: item.image,
  weight: item.weight ?? item.variant_value ?? '',
  price: pickBestPrice(item),
  qty: Math.max(1, positiveAmount(item.qty) ?? 1),
  msrp: money(amount(item.msrp ?? item.mrp ?? item.regular_price ?? item.price) ?? 0),
  sale_price: money(amount(item.sale_price ?? item.selling_price ?? item.offer_price) ?? 0),
});

const hasIdentifier = (value) => (
  (typeof value === 'string' && value.trim() !== '') ||
  (typeof value === 'number' && Number.isFinite(value))
);

const matchesItem = (offer, item) => {
  const productId = offer.pid ?? offer.productid ?? offer.id;
  const variantId = offer.vid ?? offer.variantid;
  return hasIdentifier(productId) && hasIdentifier(variantId) &&
    hasIdentifier(item.id) && hasIdentifier(item.variantid) &&
    String(productId) === String(item.id) &&
    String(variantId) === String(item.variantid);
};

const bottleSize = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(?:ml)?$/i);
  return match ? positiveAmount(match[1]) : null;
};

export const getCartPricing = (normalizedItems, freeItems = []) => {
  const sourceItems = Array.isArray(normalizedItems) ? normalizedItems : [];
  const sourceOffers = Array.isArray(freeItems) ? freeItems : [];
  const qualifyingSizes = new Set();
  const activeOffers = sourceOffers.filter((offer) => {
    if (!offer || positiveAmount(offer.free_qty) === null) return false;
    const freeItem = sourceItems.find((item) => (
      positiveAmount(item.qty) !== null && matchesItem(offer, item)
    ));
    if (!freeItem) return false;

    // Offers cover bottles of one size across fragrances. The IDs identify
    // the free bottle, not every paid product contributing to the offer.
    const offerSize = bottleSize(offer.variant_value);
    const itemSize = bottleSize(freeItem.weight);
    const size = offerSize ?? itemSize;
    if (size !== null && (offerSize === null || itemSize === null || offerSize === itemSize)) {
      qualifyingSizes.add(size);
    }
    return true;
  });
  const items = sourceItems.map((item) => {
    const qty = amount(item.qty) ?? 0;
    const matchingOffers = activeOffers.filter((offer) => matchesItem(offer, item));
    const offerPrice = matchingOffers.map((offer) => positiveAmount(offer.original_price))
      .find((price) => price !== null);
    // Checkout may price the provider's already-priced rows again. Preserve
    // the normal price so removing an offer restores it on every product.
    const normalPrice = money(amount(item.normalPrice) ?? amount(item.price) ?? 0);
    const qualifies = matchingOffers.length > 0 || qualifyingSizes.has(bottleSize(item.weight));
    const originalPrice = qualifies ? positiveAmount(item.msrp) : null;
    const price = money(offerPrice ?? originalPrice ?? normalPrice);
    const subtotal = money(price * qty);
    const offers = matchingOffers.map((offer) => {
      const freeQty = positiveAmount(offer.free_qty);
      const originalPrice = positiveAmount(offer.original_price) ?? price;
      const finalPrice = amount(offer.final_price) ?? 0;
      // The backend discount is already the sum for this offer row.
      const discount = amount(offer.discount) ?? Math.max(0, originalPrice - finalPrice) * freeQty;
      return { ...offer, free_qty: freeQty, discount: money(discount) };
    });
    const discount = Math.min(subtotal, money(offers.reduce((sum, offer) => sum + offer.discount, 0)));
    const freeQty = Math.min(qty, offers.reduce((sum, offer) => sum + offer.free_qty, 0));
    return { ...item, normalPrice, price, subtotal, discount, total: money(subtotal - discount), freeQty, offers };
  });
  const subtotal = money(items.reduce((sum, item) => sum + item.subtotal, 0));
  const discount = money(items.reduce((sum, item) => sum + item.discount, 0));
  return { items, subtotal, discount, total: money(subtotal - discount) };
};
