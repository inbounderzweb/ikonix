// src/lib/ecommerce.js
// GA4 recommended ecommerce events, built from this app's actual product
// and cart data shapes. One function per event — call sites never build
// the dataLayer payload by hand, so every event stays consistently shaped.
import { pushToDataLayer, resetEcommerce } from "./gtm";

const BRAND = "IKONIX";
export const CURRENCY = "INR";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Drop undefined keys so we never push literal `undefined` into the
// dataLayer (GTM variables would just read "undefined" otherwise).
const clean = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
};

/**
 * Build a GA4 item from a raw product object (as returned by the products
 * API, used on listing/detail pages where item_category is available).
 */
export function productToItem(product, { variant, index } = {}) {
  const v = variant || product?.variants?.[0] || {};
  const price = Number(v.sale_price || v.price || 0) || 0;
  return clean({
    item_id: product?.id !== undefined ? String(product.id) : undefined,
    item_name: product?.name || undefined,
    item_brand: BRAND,
    item_category: product?.category_name || undefined,
    item_variant: v.vid !== undefined && v.vid !== "" ? String(v.vid) : undefined,
    price: round2(price),
    quantity: 1,
    index,
  });
}

/**
 * Build a GA4 item from a CartContext cart item (id/variantid/name/price/qty
 * — no category_name available at this layer, so it's simply omitted
 * rather than guessed).
 */
export function cartItemToItem(cartItem) {
  return clean({
    item_id: cartItem?.id !== undefined ? String(cartItem.id) : undefined,
    item_name: cartItem?.name || undefined,
    item_brand: BRAND,
    item_variant:
      cartItem?.variantid !== undefined && cartItem?.variantid !== ""
        ? String(cartItem.variantid)
        : undefined,
    price: round2(cartItem?.price),
    quantity: Math.max(1, Number(cartItem?.qty) || 1),
  });
}

const sumCartValue = (cartItems) =>
  round2((cartItems || []).reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0));

/* ---------------- Product listing ---------------- */

export function trackViewItemList(products, { listId, listName }) {
  if (!products?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "view_item_list",
    ecommerce: {
      item_list_id: listId,
      item_list_name: listName,
      items: products.map((p, index) => productToItem(p, { index })),
    },
  });
}

export function trackSelectItem(product, { listId, listName } = {}) {
  if (!product) return;
  resetEcommerce();
  pushToDataLayer({
    event: "select_item",
    ecommerce: {
      item_list_id: listId,
      item_list_name: listName,
      items: [productToItem(product)],
    },
  });
}

/* ---------------- Product detail ---------------- */

export function trackViewItem(product, variant) {
  if (!product) return;
  const item = productToItem(product, { variant });
  resetEcommerce();
  pushToDataLayer({
    event: "view_item",
    ecommerce: {
      currency: CURRENCY,
      value: item.price,
      items: [item],
    },
  });
}

/* ---------------- Cart ---------------- */

export function trackAddToCart(product, variant, qty = 1) {
  if (!product) return;
  const item = productToItem(product, { variant });
  item.quantity = Math.max(1, Number(qty) || 1);
  resetEcommerce();
  pushToDataLayer({
    event: "add_to_cart",
    ecommerce: {
      currency: CURRENCY,
      value: round2(item.price * item.quantity),
      items: [item],
    },
  });
}

export function trackViewCart(cartItems) {
  if (!cartItems?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "view_cart",
    ecommerce: {
      currency: CURRENCY,
      value: sumCartValue(cartItems),
      items: cartItems.map(cartItemToItem),
    },
  });
}

/* ---------------- Checkout ---------------- */

export function trackBeginCheckout(cartItems) {
  if (!cartItems?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "begin_checkout",
    ecommerce: {
      currency: CURRENCY,
      value: sumCartValue(cartItems),
      items: cartItems.map(cartItemToItem),
    },
  });
}

export function trackAddShippingInfo(cartItems, { shippingTier, value } = {}) {
  if (!cartItems?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "add_shipping_info",
    ecommerce: {
      currency: CURRENCY,
      value: round2(value ?? sumCartValue(cartItems)),
      shipping_tier: shippingTier || "Standard",
      items: cartItems.map(cartItemToItem),
    },
  });
}

export function trackAddPaymentInfo(cartItems, { paymentType, value } = {}) {
  if (!cartItems?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "add_payment_info",
    ecommerce: {
      currency: CURRENCY,
      value: round2(value ?? sumCartValue(cartItems)),
      payment_type: paymentType || "Razorpay",
      items: cartItems.map(cartItemToItem),
    },
  });
}

/* ---------------- Purchase ---------------- */

export function trackPurchase({
  transactionId,
  value,
  items,
  shipping = 0,
  tax = 0,
  coupon = "",
}) {
  if (!transactionId || !items?.length) return;
  resetEcommerce();
  pushToDataLayer({
    event: "purchase",
    ecommerce: clean({
      transaction_id: String(transactionId),
      value: round2(value),
      tax: round2(tax),
      shipping: round2(shipping),
      currency: CURRENCY,
      coupon: coupon || undefined,
      items: items.map(cartItemToItem),
    }),
  });
}

/* ---------------- Payment failure (non-ecommerce, kept separate from purchase) ---------------- */

export function trackPaymentFailed({ orderId, message } = {}) {
  pushToDataLayer(
    clean({
      event: "payment_failed",
      order_id: orderId !== undefined ? String(orderId) : undefined,
      payment_error_message: message || "Payment failed",
    })
  );
}
