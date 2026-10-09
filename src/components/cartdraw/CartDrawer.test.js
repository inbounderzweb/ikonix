import React from 'react';
import { render, screen, within } from '@testing-library/react';
import CartDrawer from './CartDrawer';
import { useCart } from '../../context/CartContext';
import { getCartPricing, normalizeServerCartItem } from '../../utils/cartPricing';
import { marjOfferResponse, sevenBottleOfferResponse } from '../../testFixtures/cartResponses';

jest.mock('../../context/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../lib/ecommerce', () => ({ trackViewCart: jest.fn() }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));

function setCartResponse(response) {
  const pricing = getCartPricing(response.data.map(normalizeServerCartItem), response.free_items);
  useCart.mockReturnValue({
    ...pricing,
    cartCount: pricing.items.reduce((sum, item) => sum + item.qty, 0),
    offerTick: 0,
    inc: jest.fn(),
    dec: jest.fn(),
    remove: jest.fn(),
    refreshIfStale: jest.fn(),
    loading: false,
    syncing: false,
  });
}

function productDetails(name) {
  return within(screen.getByRole('button', { name }).parentElement.parentElement);
}

beforeEach(() => {
  jest.clearAllMocks();
  setCartResponse(marjOfferResponse);
});

test('the supplied response shows a free bottle only on Marj and preserves each cart quantity', () => {
  render(<CartDrawer open onClose={jest.fn()} />);

  expect(screen.getByRole('status')).toHaveTextContent('Congratulations! 1 bottle free');
  expect(screen.getByRole('status')).toHaveTextContent('Inspired By Marj — 30 ml × 1 free');
  expect(screen.getByRole('status')).toHaveTextContent('You save Rs.599.00/- on this order');
  const marj = productDetails('Inspired By Marj');
  expect(marj.getByText('Rs.599', { exact: true })).toBeInTheDocument();
  expect(marj.getByText('Includes 1 free — save Rs.599.00/-')).toBeInTheDocument();
  expect(marj.getByText('5', { exact: true })).toBeInTheDocument();
  const oud = productDetails('Inspired By Oud Maracujá');
  expect(oud.getByText('Rs.1316', { exact: true })).toBeInTheDocument();
  expect(oud.getByText('1', { exact: true })).toBeInTheDocument();
  expect(oud.queryByText(/Includes .* free/)).not.toBeInTheDocument();
});

test('the latest response identifies one paid and one free Sauvage bottle in its existing cart row', () => {
  setCartResponse(sevenBottleOfferResponse);
  render(<CartDrawer open onClose={jest.fn()} />);
  expect(screen.getAllByRole('button', { name: 'Inspired By Sauvage' })).toHaveLength(1);
  const sauvage = productDetails('Inspired By Sauvage');
  expect(sauvage.getByText('2', { exact: true })).toBeInTheDocument();
  expect(sauvage.getByText('1 paid + 1 free')).toBeInTheDocument();
  expect(sauvage.getByText('Free bottle: Rs.0.00/-')).toBeInTheDocument();
  expect(sauvage.getByText('Total: Rs.499.00/-')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Congratulations! 1 bottle free');
  expect(screen.getByRole('status')).toHaveTextContent('Inspired By Sauvage — 30 ml × 1 free');
  expect(screen.getByRole('status')).toHaveTextContent('You save Rs.499.00/-');
  expect(productDetails('Inspired By Stronger With You').queryByText(/paid \+ .*free/)).not.toBeInTheDocument();
});

test('a new response assigning the free bottle to another product updates its label and prices', () => {
  const { rerender } = render(<CartDrawer open onClose={jest.fn()} />);
  setCartResponse({
    ...marjOfferResponse,
    free_items: [{
      ...marjOfferResponse.free_items[0],
      pid: '87',
      vid: '44',
      variant_value: '100',
      original_price: 1549,
      discount: 1549,
    }],
  });
  rerender(<CartDrawer open onClose={jest.fn()} />);

  const marj = productDetails('Inspired By Marj');
  expect(marj.getByText('Rs.569', { exact: true })).toBeInTheDocument();
  expect(marj.queryByText(/Includes .* free/)).not.toBeInTheDocument();
  const oud = productDetails('Inspired By Oud Maracujá');
  expect(oud.getByText('Rs.1549', { exact: true })).toBeInTheDocument();
  expect(oud.getByText('Includes 1 free — save Rs.1549.00/-')).toBeInTheDocument();
  expect(oud.getByText('1', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('You save Rs.1549.00/- on this order');
});

test.each([
  ['an empty offer list', []],
  ['an omitted offer list', undefined],
  ['a null offer list', null],
  ['an invalid offer list', { free_qty: 1 }],
  ['a null offer', [null]],
  ['a zero free quantity', [{ ...marjOfferResponse.free_items[0], free_qty: 0 }]],
  ['a different product', [{ ...marjOfferResponse.free_items[0], pid: '999' }]],
  ['a different variant', [{ ...marjOfferResponse.free_items[0], vid: '999' }]],
  ['a mismatched bottle size', [{ ...marjOfferResponse.free_items[0], variant_value: '100' }]],
  ['a paid offer item', [{ ...marjOfferResponse.free_items[0], final_price: 100 }]],
])('a response with %s removes both the banner and the free-product label', (_name, freeItems) => {
  const { rerender } = render(<CartDrawer open onClose={jest.fn()} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Includes 1 free — save Rs.599.00/-')).toBeInTheDocument();

  setCartResponse({ ...marjOfferResponse, free_items: freeItems });
  rerender(<CartDrawer open onClose={jest.fn()} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.queryByText(/Includes .* free/)).not.toBeInTheDocument();
  expect(productDetails('Inspired By Marj').getByText('Rs.569', { exact: true })).toBeInTheDocument();
  expect(productDetails('Inspired By Oud Maracujá').getByText('Rs.1316', { exact: true })).toBeInTheDocument();
});
