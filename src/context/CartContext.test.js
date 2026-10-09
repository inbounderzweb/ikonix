import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { CartProvider, readGuest, useCart, writeGuest } from './CartContext';
import { useAuth } from './AuthContext';
import { createApiClient } from '../api/client';
import { toastError } from '../utils/toast';
import { marjOfferResponse, sauvOfferResponse, sevenBottleOfferResponse } from '../testFixtures/cartResponses';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../api/client', () => ({ createApiClient: jest.fn() }));
jest.mock('../utils/toast', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
  truncateName: (name) => name,
}));

let cart;
let auth;
let api;

const firstItem = { id: 10, variantid: '100', name: 'Perfume', price: 400, qty: 2 };
const secondItem = { id: 20, variantid: '200', name: 'Another perfume', price: 500, qty: 1 };

function ObserveCart() {
  cart = useCart();
  return <span>{cart.cartCount}</span>;
}

function mountCart() {
  return render(<CartProvider><ObserveCart /></CartProvider>);
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  auth = { user: null, token: '', setToken: jest.fn() };
  useAuth.mockImplementation(() => auth);
  api = { post: jest.fn().mockResolvedValue({ data: { data: [] } }) };
  createApiClient.mockReturnValue(api);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('an empty guest cart never reads or synchronizes the shared server cart', async () => {
  mountCart();
  await act(async () => {
    await cart.refresh();
    await cart.syncGuestToServer();
  });
  expect(cart.items).toEqual([]);
  expect(api.post).not.toHaveBeenCalled();
});

test('the supplied cart item uses its sale price and variant when checkout adds delivery', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: {
    status: true, message: 'Success', delivery_charge: '70', total_qty: '1', total_amount: 809, free_items: [],
    data: [{ cartid: '168', id: '92', vid: '58', qty: '1', name: 'Inspired By Soleil Blanc', price: '899', sale_price: '809', weight: '50' }],
  } });
  mountCart();

  await waitFor(() => expect(cart.items).toHaveLength(1));
  expect(cart.items[0]).toMatchObject({ cartid: '168', id: 92, variantid: '58', price: 809, qty: 1 });
  expect(cart.discount).toBe(0);
  expect(cart.cartCount).toBe(1);
});

test('server offer pricing changes dynamically and returns to sale pricing when the offer ends', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  const item = {
    cartid: '1193', id: '87', vid: '42', qty: '5', name: 'Inspired By Oud Maracujá',
    price: '599', sale_price: '569', weight: '30',
  };
  const offer = {
    pid: '87', vid: '42', free_qty: 1, original_price: 599, discount: 599, final_price: 0,
    offer_label: 'Buy 4 Get 1 Free',
  };
  api.post.mockResolvedValue({ data: {
    status: true, total_amount: 0, delivery_charge: 0, free_items: [offer], data: [item],
  } });
  mountCart();

  await waitFor(() => expect(cart.items[0]?.price).toBe(599));
  expect(cart.items[0]).toMatchObject({ qty: 5, subtotal: 2995, discount: 599, total: 2396, freeQty: 1 });
  expect(cart.cartCount).toBe(5);
  expect(cart.discount).toBe(599);

  api.post.mockResolvedValue({ data: {
    status: true, total_amount: 0, delivery_charge: 0,
    free_items: [{ ...offer, original_price: 650, discount: 650 }], data: [item],
  } });
  await act(async () => { await cart.refresh(); });
  expect(cart.items[0]).toMatchObject({ price: 650, total: 2600 });
  expect(cart.discount).toBe(650);

  api.post.mockResolvedValue({ data: {
    status: true, total_amount: 2276, delivery_charge: 0,
    free_items: [], data: [{ ...item, qty: '4' }],
  } });
  await act(async () => { await cart.refresh(); });
  expect(cart.items[0]).toMatchObject({ price: 569, qty: 4, total: 2276, freeQty: 0 });
  expect(cart.discount).toBe(0);
  expect(cart.cartCount).toBe(4);
});

test('the supplied response applies the Marj free bottle while the 100ml Oud keeps its sale price', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: marjOfferResponse });
  mountCart();

  await waitFor(() => expect(cart.items).toHaveLength(2));
  expect(cart.items).toEqual([
    expect.objectContaining({
      id: 98, variantid: '75', qty: 5, price: 599,
      subtotal: 2995, discount: 599, total: 2396, freeQty: 1,
    }),
    expect.objectContaining({
      id: 87, variantid: '44', qty: 1, price: 1316,
      subtotal: 1316, discount: 0, total: 1316, freeQty: 0, offers: [],
    }),
  ]);
  expect(cart.items[0].qty - cart.items[0].freeQty).toBe(4);
  expect(cart.items.reduce((sum, item) => sum + item.subtotal, 0)).toBe(4311);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(3712);
  expect(cart.discount).toBe(599);
  expect(cart.cartCount).toBe(6);
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '98', vid: '75', free_qty: 1, discount: 599 })]);
});

test('the supplied mixed-product response applies one free Sauvage bottle without celebrating a passive load', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: sauvOfferResponse });
  mountCart();

  await waitFor(() => expect(cart.items).toHaveLength(5));

  expect(cart.items).toEqual([
    expect.objectContaining({ id: 87, variantid: '42', qty: 1, price: 599, total: 599, freeQty: 0 }),
    expect.objectContaining({ id: 88, variantid: '45', qty: 2, price: 499, subtotal: 998, discount: 499, total: 499, freeQty: 1 }),
    expect.objectContaining({ id: 90, variantid: '51', qty: 1, price: 499, total: 499, freeQty: 0 }),
    expect.objectContaining({ id: 98, variantid: '75', qty: 1, price: 599, total: 599, freeQty: 0 }),
    expect.objectContaining({ id: 99, variantid: '78', qty: 1, price: 699, total: 699, freeQty: 0 }),
  ]);
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '88', vid: '45', free_qty: 1, discount: 499 })]);
  expect(cart.items.reduce((sum, item) => sum + item.subtotal, 0)).toBe(3394);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(2895);
  expect(cart.discount).toBe(499);
  expect(cart.cartCount).toBe(6);
  expect(cart.offerTick).toBe(0);
});

test('each successful add with a validated free bottle celebrates even when the free quantity stays unchanged', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { status: true, free_items: [], data: [] } });
  mountCart();
  await waitFor(() => expect(cart.loading).toBe(false));

  act(() => { cart.applyServerCart(sauvOfferResponse, { celebrateOffer: true }); });
  expect(cart.offerTick).toBe(1);
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '88', vid: '45', free_qty: 1 })]);

  act(() => {
    cart.applyServerCart({
      ...sauvOfferResponse,
      total_qty: '7',
      data: sauvOfferResponse.data.map((item) => item.id === '98' ? { ...item, qty: '2' } : item),
    }, { celebrateOffer: true });
  });

  expect(cart.offerTick).toBe(2);
  expect(cart.cartCount).toBe(7);
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '88', vid: '45', free_qty: 1 })]);
});

test('a qualifying add marks the already-present Sauvage cart line free without adding a duplicate row', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { ...sevenBottleOfferResponse, free_items: [] } });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(6));
  expect(cart.items.find((item) => item.id === 88)).toMatchObject({ qty: 2, paidQty: 2, freeQty: 0, total: 948 });

  act(() => { cart.applyServerCart(sevenBottleOfferResponse, { celebrateOffer: true }); });

  expect(cart.items).toHaveLength(6);
  expect(cart.items.filter((item) => item.id === 88 && item.variantid === '45')).toEqual([
    expect.objectContaining({ cartid: '1269', qty: 2, paidQty: 1, freeQty: 1, discount: 499, total: 499 }),
  ]);
  expect(cart.cartCount).toBe(7);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(3494);
  expect(cart.offerTick).toBe(1);
});

test('passive refreshes and checkout snapshots do not replay congratulations when an offer appears or returns', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { ...sauvOfferResponse, free_items: [] } });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(5));

  api.post.mockResolvedValue({ data: sauvOfferResponse });
  await act(async () => { await cart.refresh(); });
  expect(cart.discount).toBe(499);
  expect(cart.offerTick).toBe(0);

  act(() => { cart.applyServerCart({ ...sauvOfferResponse, free_items: [] }); });
  expect(cart.discount).toBe(0);
  act(() => { cart.applyServerCart(sauvOfferResponse); });
  expect(cart.discount).toBe(499);
  expect(cart.offerTick).toBe(0);

  await act(async () => { await cart.refresh(); });
  expect(cart.offerTick).toBe(0);
});

test('a qualifying add can celebrate before the first cart fetch finishes', async () => {
  let resolveInitialCart;
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockReturnValue(new Promise((resolve) => { resolveInitialCart = resolve; }));
  mountCart();
  expect(cart.loading).toBe(true);

  act(() => { cart.applyServerCart(sauvOfferResponse, { celebrateOffer: true }); });
  expect(cart.offerTick).toBe(1);
  expect(cart.discount).toBe(499);

  await act(async () => { resolveInitialCart({ data: sauvOfferResponse }); });

  expect(cart.offerTick).toBe(1);
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '88', vid: '45', free_qty: 1 })]);
});

test('an acknowledgement-only add celebrates once when its following full cart refresh confirms an offer', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { status: true, free_items: [], data: [] } });
  mountCart();
  await waitFor(() => expect(cart.loading).toBe(false));
  let snapshotApplied;
  act(() => { snapshotApplied = cart.applyServerCart({ status: true, message: 'Success' }, { celebrateOffer: true }); });
  expect(snapshotApplied).toBe(false);
  expect(cart.offerTick).toBe(0);

  api.post.mockResolvedValue({ data: sauvOfferResponse });
  await act(async () => { await cart.refresh({ celebrateOffer: !snapshotApplied }); });
  expect(cart.offerTick).toBe(1);
  expect(cart.discount).toBe(499);

  await act(async () => { await cart.refresh(); });
  expect(cart.offerTick).toBe(1);
});

test('a queued add refresh preserves its celebration request until a full eligible response arrives', async () => {
  let resolveInitialCart;
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post
    .mockImplementationOnce(() => new Promise((resolve) => { resolveInitialCart = resolve; }))
    .mockResolvedValue({ data: sauvOfferResponse });
  mountCart();

  await act(async () => { await cart.refresh({ celebrateOffer: true }); });
  expect(cart.offerTick).toBe(0);
  await act(async () => { resolveInitialCart({ data: { status: true, free_items: [], data: [] } }); });

  await waitFor(() => expect(cart.offerTick).toBe(1));
  expect(cart.discount).toBe(499);
  expect(api.post).toHaveBeenCalledTimes(2);

  await act(async () => { await cart.refresh(); });
  expect(cart.offerTick).toBe(1);
});

test('clearing the cart cancels an in-flight offer celebration and prevents old products returning', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { status: true, free_items: [], data: [] } });
  mountCart();
  await waitFor(() => expect(cart.loading).toBe(false));
  let resolveRefresh;
  api.post.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve; }));
  let refresh;
  act(() => { refresh = cart.refresh({ celebrateOffer: true }); });
  act(() => { cart.clear(); });
  await act(async () => {
    resolveRefresh({ data: sevenBottleOfferResponse });
    await refresh;
  });
  expect(cart.items).toEqual([]);
  expect(cart.freeItems).toEqual([]);
  expect(cart.cartCount).toBe(0);
  expect(cart.offerTick).toBe(0);
});

test.each([
  ['an empty offer list', []],
  ['an omitted offer list', undefined],
  ['a null offer list', null],
  ['a non-array offer list', { free_qty: 1 }],
  ['a null offer', [null]],
  ['a zero free quantity', [{ ...marjOfferResponse.free_items[0], free_qty: 0 }]],
  ['a negative free quantity', [{ ...marjOfferResponse.free_items[0], free_qty: -1 }]],
  ['an invalid free quantity', [{ ...marjOfferResponse.free_items[0], free_qty: 'invalid' }]],
  ['a fractional free quantity', [{ ...marjOfferResponse.free_items[0], free_qty: 0.5 }]],
  ['missing product and variant identifiers', [{ free_qty: 2, original_price: 599, discount: 1198, final_price: 0 }]],
  ['a different product identifier', [{ ...marjOfferResponse.free_items[0], pid: '999', free_qty: 2 }]],
  ['a different variant identifier', [{ ...marjOfferResponse.free_items[0], vid: '999', free_qty: 2 }]],
  ['a bottle size that does not match the free product', [{ ...marjOfferResponse.free_items[0], variant_value: '100' }]],
  ['a paid item presented as free', [{ ...marjOfferResponse.free_items[0], final_price: 100 }]],
  ['an invalid final price', [{ ...marjOfferResponse.free_items[0], final_price: 'invalid' }]],
  ['a negative discount', [{ ...marjOfferResponse.free_items[0], discount: -1 }]],
  ['an invalid discount', [{ ...marjOfferResponse.free_items[0], discount: 'invalid' }]],
])('a new response with %s removes stale offers and restores sale pricing', async (_name, freeItems) => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: marjOfferResponse });
  mountCart();
  await waitFor(() => expect(cart.discount).toBe(599));
  const previousTick = cart.offerTick;
  const response = { ...marjOfferResponse, free_items: freeItems };
  if (freeItems === undefined) delete response.free_items;
  api.post.mockResolvedValue({ data: response });

  await act(async () => { await cart.refresh({ celebrateOffer: true }); });

  expect(cart.items).toEqual([
    expect.objectContaining({ id: 98, price: 569, qty: 5, subtotal: 2845, discount: 0, total: 2845, freeQty: 0, offers: [] }),
    expect.objectContaining({ id: 87, price: 1316, qty: 1, subtotal: 1316, discount: 0, total: 1316, freeQty: 0, offers: [] }),
  ]);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(4161);
  expect(cart.discount).toBe(0);
  expect(cart.freeItems).toEqual([]);
  expect(cart.offerTick).toBe(previousTick);
});

test('only matched valid offers are exposed and increasing unmatched free quantities does not celebrate', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: marjOfferResponse });
  mountCart();
  await waitFor(() => expect(cart.discount).toBe(599));
  const previousTick = cart.offerTick;
  api.post.mockResolvedValue({ data: {
    ...marjOfferResponse,
    free_items: [
      marjOfferResponse.free_items[0],
      { ...marjOfferResponse.free_items[0], pid: '999', free_qty: 3, discount: 1797 },
      null,
    ],
  } });

  await act(async () => { await cart.refresh(); });

  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '98', vid: '75', free_qty: 1, discount: 599 })]);
  expect(cart.discount).toBe(599);
  expect(cart.offerTick).toBe(previousTick);
});

test('public offers use the free quantities and savings actually applied to the product', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: {
    ...marjOfferResponse,
    free_items: [{ ...marjOfferResponse.free_items[0], free_qty: '8', discount: '6000' }],
  } });
  mountCart();

  await waitFor(() => expect(cart.items).toHaveLength(2));
  expect(cart.items[0]).toMatchObject({ qty: 5, subtotal: 2995, discount: 2995, total: 0, freeQty: 5 });
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '98', vid: '75', free_qty: 5, discount: 2995 })]);
  expect(cart.discount).toBe(2995);
});

test('a paid eligible product uses its updated original_price while the ordinary price stays unchanged', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  const paidItem = {
    cartid: '1267', id: '88', vid: '76', name: 'Paid 30ml perfume', qty: '1',
    weight: '30', price: '599', original_price: 599, sale_price: '569',
  };
  api.post.mockResolvedValue({ data: { ...marjOfferResponse, data: [...marjOfferResponse.data, paidItem] } });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(3));
  expect(cart.items[2]).toMatchObject({ price: 599, subtotal: 599, total: 599, freeQty: 0 });

  api.post.mockResolvedValue({ data: {
    ...marjOfferResponse,
    data: [...marjOfferResponse.data, { ...paidItem, original_price: 650 }],
  } });
  await act(async () => { await cart.refresh(); });

  expect(cart.items[2]).toMatchObject({ price: 650, subtotal: 650, total: 650, freeQty: 0, offers: [] });
  expect(cart.items[0]).toMatchObject({ price: 599, discount: 599, total: 2396 });
  expect(cart.items[1]).toMatchObject({ price: 1316, total: 1316 });
});

test.each([
  ['status', { status: false }],
  ['success', { success: false }],
])('a failed response identified by %s cannot replace products or introduce free items', async (_name, rejection) => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: { ...marjOfferResponse, free_items: [] } });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(2));

  act(() => {
    cart.applyServerCart({ ...marjOfferResponse, ...rejection, data: [{ ...marjOfferResponse.data[0], qty: '10' }] }, { celebrateOffer: true });
  });

  expect(cart.items[0]).toMatchObject({ price: 569, qty: 5, freeQty: 0 });
  expect(cart.items).toHaveLength(2);
  expect(cart.freeItems).toEqual([]);
  expect(cart.discount).toBe(0);
  expect(cart.offerTick).toBe(0);
});

test('an increment applies its returned offer snapshot immediately', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: {
    ...marjOfferResponse,
    free_items: [],
    data: [{ ...marjOfferResponse.data[0], qty: '4' }, marjOfferResponse.data[1]],
  } });
  mountCart();
  await waitFor(() => expect(cart.items[0]?.qty).toBe(4));
  api.post.mockClear();
  api.post.mockResolvedValue({ data: marjOfferResponse });

  await act(async () => { await cart.inc('1254', 98, '75'); });

  expect(cart.items[0]).toMatchObject({ price: 599, qty: 5, discount: 599, total: 2396, freeQty: 1 });
  expect(cart.freeItems).toEqual([expect.objectContaining({ pid: '98', vid: '75', free_qty: 1 })]);
  expect(cart.offerTick).toBe(1);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('a decrement immediately removes an offer omitted from the returned snapshot', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: marjOfferResponse });
  mountCart();
  await waitFor(() => expect(cart.discount).toBe(599));
  const response = {
    ...marjOfferResponse,
    data: [{ ...marjOfferResponse.data[0], qty: '4' }, marjOfferResponse.data[1]],
  };
  delete response.free_items;
  api.post.mockClear();
  api.post.mockResolvedValue({ data: response });

  await act(async () => { await cart.dec('1254', 98, '75'); });

  expect(cart.items[0]).toMatchObject({ price: 569, qty: 4, discount: 0, total: 2276, freeQty: 0 });
  expect(cart.freeItems).toEqual([]);
  expect(cart.discount).toBe(0);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('removing a product immediately applies the remaining cart from its response', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockResolvedValue({ data: marjOfferResponse });
  mountCart();
  await waitFor(() => expect(cart.discount).toBe(599));
  api.post.mockClear();
  api.post.mockResolvedValue({ data: { ...marjOfferResponse, free_items: [], data: [marjOfferResponse.data[1]] } });

  await act(async () => { await cart.remove('1254', 98, '75'); });

  expect(cart.items).toEqual([expect.objectContaining({ id: 87, qty: 1, price: 1316, discount: 0, total: 1316, freeQty: 0 })]);
  expect(cart.freeItems).toEqual([]);
  expect(cart.cartCount).toBe(1);
  expect(cart.discount).toBe(0);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test.each([
  ['the offer size', { variant_value: '30' }],
  ['the free product size when the offer omits it', {}],
])('mixed-product offers use each eligible product original price from %s and restore sale prices', async (_name, offerSize) => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  const data = [
    { cartid: '1193', id: '87', vid: '42', qty: '2', name: 'Oud perfume', price: '599', sale_price: '569', weight: '30' },
    { cartid: '1194', id: '88', vid: '43', qty: '2', name: 'Rose perfume', price: '699', sale_price: '629', weight: '30' },
    { cartid: '1195', id: '89', vid: '44', qty: '1', name: 'Free perfume', price: '499', sale_price: '449', weight: '30' },
    { cartid: '1196', id: '92', vid: '58', qty: '1', name: 'Large perfume', price: '899', sale_price: '809', weight: '50' },
  ];
  const offer = {
    pid: '89', vid: '44', free_qty: 1, original_price: 499, discount: 499, final_price: 0,
    offer_label: 'Buy 4 Get 1 Free', ...offerSize,
  };
  api.post.mockResolvedValue({ data: { status: true, free_items: [offer], data } });
  mountCart();

  await waitFor(() => expect(cart.items).toHaveLength(4));
  expect(cart.items).toEqual([
    expect.objectContaining({ id: 87, price: 599, qty: 2, subtotal: 1198, discount: 0, total: 1198, freeQty: 0, offers: [] }),
    expect.objectContaining({ id: 88, price: 699, qty: 2, subtotal: 1398, discount: 0, total: 1398, freeQty: 0, offers: [] }),
    expect.objectContaining({ id: 89, price: 499, qty: 1, subtotal: 499, discount: 499, total: 0, freeQty: 1, offers: [expect.objectContaining(offer)] }),
    expect.objectContaining({ id: 92, price: 809, qty: 1, subtotal: 809, discount: 0, total: 809, freeQty: 0, offers: [] }),
  ]);
  expect(cart.discount).toBe(499);
  expect(cart.cartCount).toBe(6);
  expect(cart.items.reduce((sum, item) => sum + item.subtotal, 0)).toBe(3904);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(3405);

  api.post.mockResolvedValue({ data: { status: true, free_items: [], data } });
  await act(async () => { await cart.refresh(); });
  expect(cart.items.map(({ price, discount, freeQty, offers }) => ({ price, discount, freeQty, offers }))).toEqual([
    { price: 569, discount: 0, freeQty: 0, offers: [] },
    { price: 629, discount: 0, freeQty: 0, offers: [] },
    { price: 449, discount: 0, freeQty: 0, offers: [] },
    { price: 809, discount: 0, freeQty: 0, offers: [] },
  ]);
  expect(cart.discount).toBe(0);
  expect(cart.items.reduce((sum, item) => sum + item.total, 0)).toBe(3654);
});

test('checkout cart snapshots update shared quantities before a decrement and preserve empty carts', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  const item = { cartid: '1193', id: '87', vid: '42', qty: '1', price: '599', sale_price: '569' };
  api.post.mockResolvedValue({ data: { status: true, free_items: [], data: [item] } });
  mountCart();
  await waitFor(() => expect(cart.items[0]?.qty).toBe(1));

  act(() => { cart.applyServerCart({ status: true, free_items: [], data: [{ ...item, qty: '2' }] }); });
  expect(cart.items[0].qty).toBe(2);
  await act(async () => { await cart.dec('1193', 87, '42'); });
  expect(cart.items[0].qty).toBe(1);
  const decrement = api.post.mock.calls.find(([_url, body]) => new URLSearchParams(body).get('qty') === '-1');
  expect(new URLSearchParams(decrement[1]).get('productid')).toBe('87');

  act(() => { cart.applyServerCart({ status: true, free_items: [], data: [] }); });
  expect(cart.items).toEqual([]);
  expect(cart.cartCount).toBe(0);
});

test('out-of-order responses from different product changes are reconciled with the latest server cart', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  const initialItems = [firstItem, secondItem];
  const latestItems = [{ ...firstItem, qty: 3 }, { ...secondItem, qty: 2 }];
  let serverItems = initialItems;
  let resolveFirst;
  let resolveSecond;
  api.post.mockImplementation((_url, body) => {
    const productId = new URLSearchParams(body).get('productid');
    if (productId === '10') return new Promise((resolve) => { resolveFirst = resolve; });
    if (productId === '20') return new Promise((resolve) => { resolveSecond = resolve; });
    return Promise.resolve({ data: { status: true, free_items: [], data: serverItems } });
  });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(2));

  let firstChange;
  let secondChange;
  act(() => {
    firstChange = cart.inc(null, 10, '100');
    secondChange = cart.inc(null, 20, '200');
  });
  serverItems = latestItems;
  await act(async () => {
    resolveSecond({ data: { status: true, free_items: [], data: latestItems } });
    await secondChange;
  });
  expect(cart.items[1].qty).toBe(2);
  await act(async () => {
    resolveFirst({ data: { status: true, free_items: [], data: [latestItems[0], secondItem] } });
    await firstChange;
  });

  await waitFor(() => expect(cart.items.map((item) => item.qty)).toEqual([3, 2]));
  expect(cart.cartCount).toBe(5);
  const reads = api.post.mock.calls.filter(([_url, body]) => !new URLSearchParams(body).has('productid'));
  expect(reads).toHaveLength(2);
});

test('guest quantity and removal changes persist locally without server requests', async () => {
  writeGuest([firstItem]);
  mountCart();

  await act(async () => { await cart.inc(999, firstItem.id, firstItem.variantid); });
  expect(readGuest()[0].qty).toBe(3);
  expect(cart.cartCount).toBe(3);

  await act(async () => {
    await cart.dec(999, firstItem.id, firstItem.variantid);
    await cart.dec(999, firstItem.id, firstItem.variantid);
    await cart.dec(999, firstItem.id, firstItem.variantid);
  });
  expect(readGuest()[0].qty).toBe(1);

  await act(async () => { await cart.remove(999, firstItem.id, firstItem.variantid); });
  expect(readGuest()).toEqual([]);
  expect(cart.items).toEqual([]);
  expect(api.post).not.toHaveBeenCalled();
});

test.each([
  ['HTTP rejection', () => Promise.reject({ response: { status: 403, data: { error: 'Forbidden' } } })],
  ['body rejection', () => Promise.resolve({ data: { status: false, error: 'Cart transfer denied' } })],
])('guest transfer keeps failed lines after %s and removes only confirmed lines', async (_name, rejectLine) => {
  writeGuest([firstItem, secondItem]);
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockImplementation((_url, body) => {
    const values = new URLSearchParams(body);
    if (values.get('productid') === String(secondItem.id)) return rejectLine();
    return Promise.resolve({ data: { success: true, data: [] } });
  });
  mountCart();

  await waitFor(() => expect(cart.syncing).toBe(false));
  expect(readGuest()).toEqual([expect.objectContaining(secondItem)]);
  expect(api.post.mock.calls.every(([_url, _body, config]) => config.requireUser)).toBe(true);
});

test.each([
  ['session rejection', { __sessionExpired: true, response: { status: 401 } }],
  ['account change', { __sessionChanged: true, response: { status: 409 } }],
])('%s stops the transfer while preserving unsubmitted guest lines', async (_name, rejection) => {
  writeGuest([firstItem, secondItem]);
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockImplementation((_url, body) => {
    if (new URLSearchParams(body).has('productid')) {
      return Promise.reject(rejection);
    }
    return Promise.resolve({ data: { data: [] } });
  });
  mountCart();

  await waitFor(() => expect(cart.syncing).toBe(false));
  const transfers = api.post.mock.calls.filter(([_url, body]) => new URLSearchParams(body).has('productid'));
  expect(transfers).toHaveLength(1);
  expect(readGuest()).toEqual([expect.objectContaining(firstItem), expect.objectContaining(secondItem)]);
});

test('a cart permission failure shows the backend error without clearing the session', async () => {
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockImplementation((_url, body) => {
    if (new URLSearchParams(body).has('productid')) {
      return Promise.reject({ response: { status: 403, data: { error: 'This cart cannot be updated' } } });
    }
    return Promise.resolve({ data: { data: [{ productid: 10, variantid: '100', qty: 2, price: 400 }] } });
  });
  mountCart();
  await waitFor(() => expect(cart.items).toHaveLength(1));

  await act(async () => { await cart.inc(99, firstItem.id, firstItem.variantid); });
  expect(auth.setToken).not.toHaveBeenCalled();
  expect(toastError).toHaveBeenCalledWith('This cart cannot be updated');
});

test('a completed request from the previous user cannot replace the guest cart after logout', async () => {
  let resolvePreviousCart;
  auth = { ...auth, user: { id: 7 }, token: 'customer-token' };
  api.post.mockReturnValue(new Promise((resolve) => { resolvePreviousCart = resolve; }));
  const view = mountCart();

  writeGuest([secondItem]);
  auth = { ...auth, user: null, token: '' };
  view.rerender(<CartProvider><ObserveCart /></CartProvider>);
  expect(cart.items).toEqual([expect.objectContaining(secondItem)]);

  await act(async () => {
    resolvePreviousCart({ data: { data: [{ productid: 10, variantid: '100', qty: 9, price: 400 }] } });
  });
  expect(cart.items).toEqual([expect.objectContaining(secondItem)]);
});
