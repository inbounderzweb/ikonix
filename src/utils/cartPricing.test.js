import { getCartPricing, normalizeServerCartItem } from './cartPricing';
import { marjOfferResponse, sevenBottleOfferResponse } from '../testFixtures/cartResponses';

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

test.each([undefined, null, '', 'invalid', -1, Infinity, 0])('invalid offer original price %s falls back to the product original price', (originalPrice) => {
  const result = getCartPricing(cartItems({ qty: '5' }), [{ ...offer, original_price: originalPrice }]);
  expect(result).toMatchObject({ subtotal: 2995, discount: 599, total: 2396 });
  expect(result.items[0].price).toBe(599);
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
  expect(result.freeItems).toEqual([expect.objectContaining({ free_qty: 1, discount: 599 })]);
});

test('money is rounded to paise while invalid prices and quantities stay finite', () => {
  expect(getCartPricing([{ id: 87, variantid: '42', price: '0.10', qty: '3' }]))
    .toMatchObject({ subtotal: 0.3, discount: 0, total: 0.3 });
  expect(getCartPricing([{ id: 87, variantid: '42', price: Infinity, qty: 'invalid' }]))
    .toMatchObject({ subtotal: 0, discount: 0, total: 0 });
});

const mixedItems = (size = '30') => [
  { ...serverItem, qty: '2', weight: size },
  { ...serverItem, id: '88', vid: '43', qty: '2', weight: size, price: '699', sale_price: '629' },
  { ...serverItem, id: '89', vid: '44', qty: '1', weight: size, price: '499', sale_price: '449' },
  { ...serverItem, id: '90', vid: '45', qty: '1', weight: '10', price: '299', sale_price: '269' },
].map(normalizeServerCartItem);
const mixedOffer = {
  ...offer, pid: '89', vid: '44', variant_value: '30', original_price: 499, discount: 499,
};

test.each(['30', '50', '100'])('an active %s ml offer uses each mixed product original price and discounts only the free bottle', (size) => {
  const result = getCartPricing(mixedItems(size), [{ ...mixedOffer, variant_value: size }]);
  expect(result).toMatchObject({ subtotal: 3364, discount: 499, total: 2865 });
  expect(result.items.map(({ price, freeQty, discount }) => ({ price, freeQty, discount }))).toEqual([
    { price: 599, freeQty: 0, discount: 0 },
    { price: 699, freeQty: 0, discount: 0 },
    { price: 499, freeQty: 1, discount: 499 },
    { price: 269, freeQty: 0, discount: 0 },
  ]);
});

test.each([undefined, '', 'invalid'])('the matching free bottle supplies the offer size when variant_value is %s', (variantValue) => {
  const result = getCartPricing(mixedItems(), [{ ...mixedOffer, variant_value: variantValue }]);
  expect(result.items.map((item) => item.price)).toEqual([599, 699, 499, 269]);
});

test('size matching accepts numeric sizes and ml labels without confusing product variant IDs', () => {
  const items = mixedItems();
  items[0].weight = 30;
  items[1].weight = '30 ML';
  const result = getCartPricing(items, [{ ...mixedOffer, variant_value: '30.0 ml' }]);
  expect(result.items.map((item) => item.price)).toEqual([599, 699, 499, 269]);
});

test.each([
  { ...mixedOffer, pid: '999' },
  { ...mixedOffer, vid: '999' },
  { ...mixedOffer, pid: '' },
  { ...mixedOffer, free_qty: 0 },
])('an invalid or absent free bottle does not activate group original pricing (%j)', (invalidOffer) => {
  const result = getCartPricing(mixedItems(), [invalidOffer]);
  expect(result).toMatchObject({ subtotal: 3114, discount: 0, total: 3114 });
  expect(result.items.map((item) => item.price)).toEqual([569, 629, 449, 269]);
});

test('conflicting offer and free-bottle sizes do not activate an offer', () => {
  const result = getCartPricing(mixedItems(), [{ ...mixedOffer, variant_value: '10' }]);
  expect(result.items.map((item) => item.price)).toEqual([569, 629, 449, 269]);
  expect(result.discount).toBe(0);
  expect(result.freeItems).toEqual([]);
});

test('missing size information only reprices the identified free product', () => {
  const items = mixedItems().map((item) => ({ ...item, weight: '' }));
  const result = getCartPricing(items, [{ ...mixedOffer, variant_value: '' }]);
  expect(result.items.map((item) => item.price)).toEqual([569, 629, 499, 269]);
});

test('simultaneous size offers use separate original prices and apply each discount once', () => {
  const items = mixedItems();
  items[3] = { ...items[3], weight: '50', qty: 4 };
  const secondOffer = { ...offer, pid: '90', vid: '45', variant_value: '50', original_price: 299, discount: 299 };
  const result = getCartPricing(items, [mixedOffer, secondOffer]);
  expect(result).toMatchObject({ subtotal: 4291, discount: 798, total: 3493 });
  expect(result.items.map((item) => item.freeQty)).toEqual([0, 0, 1, 1]);
});

test('repeated pricing is stable and removing the offer restores every normal price, including discount_price', () => {
  const items = mixedItems();
  items[1] = normalizeServerCartItem({
    ...serverItem, id: '88', vid: '43', qty: '2', weight: '30',
    price: '699', sale_price: undefined, discount_price: '629',
  });
  const result = getCartPricing(items, [mixedOffer]);
  expect(getCartPricing(result.items, [mixedOffer])).toEqual(result);
  expect(getCartPricing(result.items, [])).toMatchObject({
    subtotal: 3114, discount: 0, total: 3114,
    items: [
      expect.objectContaining({ price: 569, freeQty: 0 }),
      expect.objectContaining({ price: 629, freeQty: 0 }),
      expect.objectContaining({ price: 449, freeQty: 0 }),
      expect.objectContaining({ price: 269, freeQty: 0 }),
    ],
  });
  expect(items[0].price).toBe(569);
});

test('missing original prices fall back to the product normal price without borrowing another fragrance price', () => {
  const items = mixedItems();
  items[0].msrp = 0;
  items[2].msrp = undefined;
  const result = getCartPricing(items, [{ ...mixedOffer, original_price: undefined, discount: undefined }]);
  expect(result.items.map((item) => item.price)).toEqual([569, 699, 449, 269]);
  expect(result.discount).toBe(449);
});

test('the supplied response charges four Marj bottles at original price and one unrelated Oud bottle at sale price', () => {
  const items = marjOfferResponse.data.map(normalizeServerCartItem);
  const result = getCartPricing(items, marjOfferResponse.free_items);
  expect(result).toMatchObject({ subtotal: 4311, discount: 599, total: 3712 });
  expect(result.items).toEqual([
    expect.objectContaining({ id: 98, variantid: '75', price: 599, qty: 5, freeQty: 1, total: 2396 }),
    expect.objectContaining({ id: 87, variantid: '44', price: 1316, qty: 1, freeQty: 0, total: 1316 }),
  ]);
  expect(getCartPricing(result.items, [])).toMatchObject({ subtotal: 4161, discount: 0, total: 4161, freeItems: [] });
});

test('the seven-bottle response makes one existing Sauvage bottle free and charges the other one', () => {
  const result = getCartPricing(sevenBottleOfferResponse.data.map(normalizeServerCartItem), sevenBottleOfferResponse.free_items);
  expect(result).toMatchObject({ subtotal: 3993, discount: 499, total: 3494 });
  expect(result.items).toHaveLength(6);
  const sauvage = result.items.filter((item) => item.id === 88 && item.variantid === '45');
  expect(sauvage).toHaveLength(1);
  expect(sauvage[0]).toMatchObject({ cartid: '1269', qty: 2, paidQty: 1, freeQty: 1, price: 499, subtotal: 998, discount: 499, total: 499 });
  expect(result.items.filter((item) => item.freeQty > 0)).toEqual(sauvage);
  expect(getCartPricing(result.items, [])).toMatchObject({ discount: 0, total: 3793 });
});

test.each([undefined, null, '', 'invalid', -1, 0])('invalid product original_price %s uses the regular price without losing the normal sale price', (originalPrice) => {
  const item = normalizeServerCartItem({ ...serverItem, original_price: originalPrice });
  expect(item).toMatchObject({ price: 569, msrp: 599 });
});

test('an eligible mixed product uses its own backend original_price even when price differs', () => {
  const items = mixedItems();
  items[1] = normalizeServerCartItem({
    ...serverItem, id: '88', vid: '43', qty: '2', weight: '30',
    price: '699', original_price: '750', sale_price: '629',
  });
  const result = getCartPricing(items, [mixedOffer]);
  expect(result.items[1]).toMatchObject({ price: 750, original_price: 750, msrp: 750, freeQty: 0, subtotal: 1500 });
  expect(getCartPricing(result.items, []).items[1].price).toBe(629);
});

test('valid offers alone determine the banner savings and free quantity', () => {
  const items = marjOfferResponse.data.map(normalizeServerCartItem);
  const valid = marjOfferResponse.free_items[0];
  const result = getCartPricing(items, [null, { ...valid, pid: '999' }, { ...valid, vid: '999' }, valid]);
  expect(result.freeItems).toEqual([valid]);
  expect(result.discount).toBe(599);
});

test('multiple offer rows cannot advertise more free bottles or savings than their matching cart line', () => {
  const result = getCartPricing(cartItems({ qty: '1' }), [offer, offer]);
  expect(result).toMatchObject({ subtotal: 599, discount: 599, total: 0 });
  expect(result.freeItems).toHaveLength(1);
  expect(result.freeItems[0]).toMatchObject({ free_qty: 1, discount: 599 });
});
