import { getCartPricing, normalizeServerCartItem } from './cartPricing';

const serverItem = {
  cartid: '1193', id: '87', vid: '42', qty: '4',
  name: 'Inspired By Oud Maracujá', image: 'perfume.jpeg', weight: '30',
  price: '599', sale_price: '569',
};
const offer = {
  pid: '87', vid: '42', free_qty: 1, original_price: 599,
  discount: 599, final_price: 0, offer_label: 'Buy 4 Get 1 Free - buy 4 get 1',
};

const cartItems = (patch = {}) => [normalizeServerCartItem({ ...serverItem, ...patch })];

test('the normal cart uses the backend sale price for its Rs.2276 subtotal', () => {
  const result = getCartPricing(cartItems());
  expect(result).toMatchObject({ subtotal: 2276, discount: 0, total: 2276 });
  expect(result.items[0]).toMatchObject({
    id: 87, variantid: '42', price: 569, qty: 4, msrp: 599, sale_price: 569,
    subtotal: 2276, discount: 0, total: 2276, freeQty: 0, offers: [],
  });
});

test('the supplied offer uses original price and discounts the included free bottle once', () => {
  const result = getCartPricing(cartItems({ qty: '5' }), [offer]);
  expect(result).toMatchObject({ subtotal: 2995, discount: 599, total: 2396 });
  expect(result.items[0]).toMatchObject({
    price: 599, qty: 5, subtotal: 2995, discount: 599, total: 2396, freeQty: 1,
    offers: [offer],
  });
});

test('changing the backend original price changes offer pricing without using a fixed catalog price', () => {
  const result = getCartPricing(cartItems({ qty: '5' }), [{ ...offer, original_price: '650', discount: '650' }]);
  expect(result).toMatchObject({ subtotal: 3250, discount: 650, total: 2600 });
  expect(result.items[0].price).toBe(650);
});

test('removing the offer restores the normal sale price without mutating the source item', () => {
  const items = cartItems({ qty: '5' });
  getCartPricing(items, [offer]);
  const result = getCartPricing(items, []);
  expect(items[0].price).toBe(569);
  expect(result).toMatchObject({ subtotal: 2845, discount: 0, total: 2845 });
});

test.each([
  { ...offer, pid: '88' },
  { ...offer, vid: '43' },
  { ...offer, pid: undefined },
  { ...offer, vid: undefined },
  { ...offer, pid: '' },
  { ...offer, vid: '' },
  { ...offer, free_qty: 0 },
  { ...offer, free_qty: 'invalid' },
])('requires both product and variant identifiers and an active free quantity (%j)', (unmatchedOffer) => {
  expect(getCartPricing(cartItems(), [unmatchedOffer])).toMatchObject({
    subtotal: 2276, discount: 0, total: 2276,
    items: [expect.objectContaining({ price: 569, freeQty: 0, offers: [] })],
  });
});

test('supports the other backend product and variant identifier keys', () => {
  const aliasedOffer = { ...offer, pid: undefined, vid: undefined, productid: 87, variantid: 42 };
  expect(getCartPricing(cartItems({ qty: '5' }), [aliasedOffer]).total).toBe(2396);
});

test('multiple free bottles do not multiply an explicit aggregate discount again', () => {
  const result = getCartPricing(cartItems({ qty: '10' }), [{ ...offer, free_qty: '2', discount: '1198' }]);
  expect(result).toMatchObject({ subtotal: 5990, discount: 1198, total: 4792 });
  expect(result.items[0]).toMatchObject({ freeQty: 2, offers: [expect.objectContaining({ free_qty: 2, discount: 1198 })] });
});

test.each([undefined, null, '', 'invalid', -1, Infinity, 0])('invalid original price %s falls back to the normal unit price', (originalPrice) => {
  const result = getCartPricing(cartItems({ qty: '5' }), [{ ...offer, original_price: originalPrice }]);
  expect(result).toMatchObject({ subtotal: 2845, discount: 599, total: 2246 });
  expect(result.items[0].price).toBe(569);
});

test('missing discount falls back to the free quantity and preserves final price zero', () => {
  const result = getCartPricing(cartItems({ qty: '10' }), [{ ...offer, free_qty: 2, discount: undefined, final_price: '0' }]);
  expect(result).toMatchObject({ subtotal: 5990, discount: 1198, total: 4792 });
});

test('an explicit zero discount remains zero instead of falling back to a free discount', () => {
  expect(getCartPricing(cartItems({ qty: '5' }), [{ ...offer, discount: '0' }]))
    .toMatchObject({ subtotal: 2995, discount: 0, total: 2995 });
});

test('discounts and free quantities cannot exceed the matching line', () => {
  const result = getCartPricing(cartItems({ qty: '1' }), [{ ...offer, free_qty: 20, discount: 9999 }]);
  expect(result).toMatchObject({ subtotal: 599, discount: 599, total: 0 });
  expect(result.items[0].freeQty).toBe(1);
});

test('money is rounded to paise while invalid prices and quantities stay finite', () => {
  expect(getCartPricing([{ id: 87, variantid: '42', price: '0.10', qty: '3' }]))
    .toMatchObject({ subtotal: 0.3, discount: 0, total: 0.3 });
  expect(getCartPricing([{ id: 87, variantid: '42', price: Infinity, qty: 'invalid' }]))
    .toMatchObject({ subtotal: 0, discount: 0, total: 0 });
});
