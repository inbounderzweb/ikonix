import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductList from './ProductList';
import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { createApiClient } from '../../api/client';
import { toastSuccess, toastError } from '../../utils/toast';
import { trackAddToCart } from '../../lib/ecommerce';
import { marjOfferResponse } from '../../testFixtures/cartResponses';

jest.mock('../../features/product/productApi', () => ({ useGetProductsQuery: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../api/client', () => ({ createApiClient: jest.fn() }));
jest.mock('../../components/ValidateOnLoad', () => () => null);
jest.mock('../../utils/toast', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
  truncateName: (name) => name,
}));
jest.mock('../../lib/ecommerce', () => ({
  trackViewItemList: jest.fn(),
  trackSelectItem: jest.fn(),
  trackAddToCart: jest.fn(),
}));

const marjProduct = {
  id: '98',
  name: 'Inspired By Marj',
  image: marjOfferResponse.data[0].image,
  category_name: 'Best Sellers',
  variants: [{ vid: '75', weight: '30', price: '599', sale_price: '569' }],
};

let auth;
let api;
let cart;

function productListTree() {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProductList />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  auth = { user: { id: 7 }, token: 'customer-token', isTokenReady: true };
  useAuth.mockImplementation(() => auth);
  useGetProductsQuery.mockReturnValue({
    data: { data: [marjProduct] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  api = { post: jest.fn().mockResolvedValue({ data: marjOfferResponse }) };
  createApiClient.mockReturnValue(api);
  cart = {
    items: [],
    refresh: jest.fn(),
    applyServerCart: jest.fn().mockReturnValue(true),
    addOrIncLocal: jest.fn(),
    inc: jest.fn(),
  };
  useCart.mockReturnValue(cart);
});

test('adding a bestseller applies a successful status-only cart response and reconciles the cart', async () => {
  render(productListTree());
  fireEvent.click(screen.getByRole('button', { name: 'cart' }));

  await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Inspired By Marj added to cart'));
  expect(cart.applyServerCart).toHaveBeenCalledWith(marjOfferResponse, { celebrateOffer: true });
  expect(cart.refresh).toHaveBeenCalledTimes(1);
  expect(cart.refresh).toHaveBeenCalledWith({ celebrateOffer: false });
  expect(toastError).not.toHaveBeenCalled();
  expect(trackAddToCart).toHaveBeenCalledWith(marjProduct, marjProduct.variants[0], 1);
  expect(api.post).toHaveBeenCalledWith(
    expect.stringMatching(/\/cart$/),
    expect.any(String),
    expect.objectContaining({ requireUser: true, expectedUserToken: 'customer-token' }),
  );
  expect(Object.fromEntries(new URLSearchParams(api.post.mock.calls[0][1]))).toEqual({
    userid: '7', productid: '98', variantid: '75', qty: '1',
  });
});

test('an acknowledgement-only add requests an offer check on its following refresh', async () => {
  const acknowledgement = { status: true, message: 'Success' };
  api.post.mockResolvedValue({ data: acknowledgement });
  cart.applyServerCart.mockReturnValue(false);
  render(productListTree());
  fireEvent.click(screen.getByRole('button', { name: 'cart' }));
  await waitFor(() => expect(cart.refresh).toHaveBeenCalledWith({ celebrateOffer: true }));
  expect(cart.applyServerCart).toHaveBeenCalledWith(acknowledgement, { celebrateOffer: true });
});

test.each([
  ['conflicting failure flags', { status: true, success: false }],
  ['a truthy false string', { status: undefined, success: 'false' }],
])('adding a bestseller rejects %s without applying products or offers', async (_name, flags) => {
  api.post.mockResolvedValue({ data: { ...marjOfferResponse, ...flags, message: 'Cart rejected' } });
  render(productListTree());
  fireEvent.click(screen.getByRole('button', { name: 'cart' }));

  await waitFor(() => expect(toastError).toHaveBeenCalledWith('Cart rejected'));
  expect(cart.applyServerCart).not.toHaveBeenCalled();
  expect(cart.refresh).toHaveBeenCalledTimes(1);
  expect(toastSuccess).not.toHaveBeenCalled();
  expect(trackAddToCart).not.toHaveBeenCalled();
});

test('a pending add response from the previous customer cannot update the current customer cart', async () => {
  let resolveAdd;
  api.post.mockReturnValue(new Promise((resolve) => { resolveAdd = resolve; }));
  const view = render(productListTree());
  fireEvent.click(screen.getByRole('button', { name: 'cart' }));
  expect(api.post).toHaveBeenCalledTimes(1);
  auth = { user: { id: 8 }, token: 'different-customer-token', isTokenReady: true };
  view.rerender(productListTree());

  await act(async () => { resolveAdd({ data: marjOfferResponse }); });

  expect(cart.applyServerCart).not.toHaveBeenCalled();
  expect(cart.refresh).not.toHaveBeenCalled();
  expect(toastSuccess).not.toHaveBeenCalled();
  expect(toastError).not.toHaveBeenCalled();
  expect(trackAddToCart).not.toHaveBeenCalled();
});
