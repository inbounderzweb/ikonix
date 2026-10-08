import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { CartProvider, readGuest, useCart, writeGuest } from './CartContext';
import { useAuth } from './AuthContext';
import { createApiClient } from '../api/client';
import { toastError } from '../utils/toast';

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
