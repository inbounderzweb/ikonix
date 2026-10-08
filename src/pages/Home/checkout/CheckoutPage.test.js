import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from './CheckoutPage';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import { trackPurchase } from '../../../lib/ecommerce';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('../../../Authmodal/AuthModal', () => () => null);
jest.mock('../../../hooks/useDocumentTitle', () => () => {});
jest.mock('../../../utils/loadRazorpay', () => () => Promise.resolve());
jest.mock('../../../components/offer/OfferCelebration', () => ({
  __esModule: true,
  default: () => null,
  useOfferBurst: () => false,
}));
jest.mock('../../../lib/ecommerce', () => ({
  trackBeginCheckout: jest.fn(),
  trackAddShippingInfo: jest.fn(),
  trackAddPaymentInfo: jest.fn(),
  trackPurchase: jest.fn(),
  trackPaymentFailed: jest.fn(),
}));
jest.mock('sweetalert2', () => Object.assign(jest.fn(), { fire: jest.fn() }));

let api;
let paymentOptions;
let cartQuote;
let deliveryMethodsResponse;
let addressesResponse;
let cartState;

const cartItem = { cartid: 1, id: 10, variantid: '100', name: 'Perfume', price: 400, qty: 1 };
const oudCartItem = {
  cartid: '1193',
  id: '87',
  qty: '4',
  name: 'Inspired By Oud Maracujá',
  image: '1785412954_447beb2529ecadbe0642.jpeg',
  vid: '42',
  price: '599',
  weight: '30',
  sale_price: '569',
};
const oudNormalQuote = {
  status: true,
  message: 'Success',
  delivery_charge: 0,
  total_qty: '4',
  total_amount: 2276,
  free_items: [],
  data: [oudCartItem],
};
const oudOffer = {
  pid: '87',
  vid: '42',
  name: 'Inspired By Oud Maracujá',
  image: oudCartItem.image,
  variant_value: '30',
  free_qty: 1,
  original_price: 599,
  discount: 599,
  final_price: 0,
  offer_label: 'Buy 4 Get 1 Free - buy 4 get 1',
};
const oudOfferQuote = {
  status: true,
  message: 'Success',
  delivery_charge: 0,
  total_qty: '5',
  total_amount: 0,
  free_items: [oudOffer],
  data: [{ ...oudCartItem, qty: '5' }],
};
const mixedOfferQuote = {
  status: true,
  delivery_charge: '70',
  total_qty: '6',
  total_amount: 0,
  free_items: [{
    pid: '89', vid: '44', variant_value: '30', free_qty: 1,
    original_price: 499, discount: 499, final_price: 0, offer_label: 'Buy 4 Get 1 Free',
  }],
  data: [
    { cartid: '1193', id: '87', vid: '42', qty: '2', name: 'Oud perfume', price: '599', sale_price: '569', weight: '30' },
    { cartid: '1194', id: '88', vid: '43', qty: '2', name: 'Rose perfume', price: '699', sale_price: '629', weight: '30' },
    { cartid: '1195', id: '89', vid: '44', qty: '1', name: 'Free perfume', price: '499', sale_price: '449', weight: '30' },
    { cartid: '1196', id: '92', vid: '58', qty: '1', name: 'Large perfume', price: '899', sale_price: '809', weight: '50' },
  ],
};
const deliveryMethodsWithoutFees = {
  status: true,
  data: [
    { id: '1', country: 'India', method: 'Normal Delivery', min_days: '7', max_days: '10' },
    { id: '2', country: 'India', method: 'Fast Delivery', min_days: '3', max_days: '5' },
  ],
};

function chargeRow(label, index = 0) {
  return screen.getAllByText(label, { exact: true, selector: 'span' })[index].parentElement;
}

function checkoutTree() {
  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CheckoutPage />
    </MemoryRouter>
  );
}

function mountCheckout() {
  return render(checkoutTree());
}

function setOudCart(quote) {
  cartQuote = quote;
  cartState = {
    ...cartState,
    items: quote.data.map((item) => ({
      ...item,
      id: Number(item.id),
      variantid: item.vid,
      qty: Number(item.qty),
      price: Number(item.sale_price),
      sale_price: Number(item.sale_price),
      msrp: Number(item.price),
    })),
    freeItems: quote.free_items,
    discount: quote.free_items.reduce((sum, offer) => sum + offer.discount, 0),
  };
  useCart.mockReturnValue(cartState);
}

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  paymentOptions = null;
  window.Razorpay = jest.fn(function (options) {
    paymentOptions = options;
    this.open = jest.fn();
    this.on = jest.fn();
  });
  deliveryMethodsResponse = { status: true, data: [{ id: '1', method: 'Normal Delivery', charge: 50 }] };
  cartQuote = { status: true, delivery_charge: '50', total: '450', data: [cartItem] };
  addressesResponse = [{ id: 1, street: 'Test street', city: 'Test city', country: 'India' }];
  api = {
    get: jest.fn().mockImplementation(() => Promise.resolve({ data: deliveryMethodsResponse })),
    post: jest.fn().mockImplementation((url) => {
      if (url.endsWith('/cart')) return Promise.resolve({ data: cartQuote });
      if (url.endsWith('/address')) {
        return Promise.resolve({ data: { data: addressesResponse } });
      }
      if (url.endsWith('/checkout') || url.endsWith('/guest-checkout')) return Promise.resolve({ data: { order_id: 25 } });
      if (url.endsWith('/payment/create-order') || url.endsWith('/guest-payment/create-order')) {
        return Promise.resolve({ data: { porder_id: 'order_test123' } });
      }
      return Promise.resolve({ data: { status: true } });
    }),
  };
  useAuth.mockReturnValue({ user: { id: 7, name: 'Customer' }, token: 'current-token' });
  cartState = {
    items: [cartItem],
    freeItems: [],
    discount: 0,
    refreshIfStale: jest.fn(),
    refresh: jest.fn(),
    applyServerCart: jest.fn(),
    ensureServerCartNotEmpty: jest.fn(),
    guestId: '0',
    api,
    clear: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn(),
    remove: jest.fn(),
  };
  useCart.mockReturnValue(cartState);
});

afterEach(() => {
  delete window.Razorpay;
  jest.restoreAllMocks();
});

async function openPayment() {
  mountCheckout();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());
}

const paymentResponse = {
  razorpay_order_id: 'order_test123',
  razorpay_payment_id: 'pay_test123',
  razorpay_signature: 'test-signature',
};

test('guest checkout loads delivery methods without requesting the shared server cart', async () => {
  useAuth.mockReturnValue({ user: null, token: '' });
  mountCheckout();
  expect(await screen.findByRole('button', { name: 'Checkout as Guest' })).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/\/delivery-methods$/));
  expect(api.post).not.toHaveBeenCalled();
});

test('a single normal delivery method still displays its fee in the main guest order summary', async () => {
  useAuth.mockReturnValue({ user: null, token: '' });
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.50.00/-'));
  expect(screen.getByText('Rs.450.00/-')).toBeInTheDocument();
  expect(screen.queryByText('Tax', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Packing', { exact: true })).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('delivery methods without fees show an unknown delivery charge instead of free delivery for a guest', async () => {
  useAuth.mockReturnValue({ user: null, token: '' });
  deliveryMethodsResponse = deliveryMethodsWithoutFees;
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Calculated at payment'));
  expect(chargeRow('Delivery Charge')).not.toHaveTextContent('Rs.0.00/-');
  expect(chargeRow('Estimated Total')).toHaveTextContent('Rs.400.00/-');
  expect(screen.queryByText('Tax', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Packing', { exact: true })).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test.each([{ status: false }, { success: false }])(
  'a failed HTTP 200 quote envelope never advertises its zero delivery fee as free (%p)',
  async (failure) => {
    cartQuote = { ...failure, delivery_charge: '0', total: '400', data: [cartItem], error: 'Quote unavailable' };
    mountCheckout();

    await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Unavailable'));
    expect(chargeRow('Delivery Charge')).not.toHaveTextContent('Rs.0.00/-');
    expect(chargeRow('Estimated Total')).toHaveTextContent('Rs.400.00/-');
    expect(screen.queryByText('Tax', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Packing', { exact: true })).not.toBeInTheDocument();
  }
);

test('backend top-level fees and total agree in the main summary, confirmation, and payment amount hint', async () => {
  deliveryMethodsResponse = deliveryMethodsWithoutFees;
  cartQuote = { status: true, delivery_charge: '75', tax: '18', packing: '12', total: '505', data: [cartItem] };
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.75.00/-'));
  expect(chargeRow('Tax')).toHaveTextContent('Rs.18.00/-');
  expect(chargeRow('Packing')).toHaveTextContent('Rs.12.00/-');
  expect(screen.getByText('Rs.505.00/-')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your Order' })).toBeInTheDocument();
  expect(screen.getAllByText('Delivery Charge', { exact: true })).toHaveLength(2);
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.75.00/-');
  expect(chargeRow('Tax', 1)).toHaveTextContent('Rs.18.00/-');
  expect(chargeRow('Packing', 1)).toHaveTextContent('Rs.12.00/-');
  expect(screen.getAllByText('Rs.505.00/-')).toHaveLength(2);

  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());
  const createOrder = api.post.mock.calls.find(([url]) => url.endsWith('/payment/create-order'));
  expect(new URLSearchParams(createOrder[1]).get('client_hint_amount')).toBe('50500');
});

test('the supplied cart response adds its Rs.70 delivery charge to the Rs.809 merchandise total through payment', async () => {
  deliveryMethodsResponse = deliveryMethodsWithoutFees;
  cartQuote = {
    status: true,
    message: 'Success',
    delivery_charge: '70',
    total_qty: '1',
    total_amount: 809,
    free_items: [],
    data: [{
      cartid: '168', id: '92', qty: '1', name: 'Inspired By Soleil Blanc',
      vid: '58', price: '899', weight: '50', sale_price: '809',
    }],
  };
  useCart.mockReturnValue({
    ...cartState,
    items: [{
      cartid: '168', id: 92, variantid: '58', name: 'Inspired By Soleil Blanc',
      price: 809, qty: 1, weight: '50', sale_price: 809, msrp: 899,
    }],
  });
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.70.00/-'));
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.809.00/-');
  expect(chargeRow('Total')).toHaveTextContent('Rs.879.00/-');
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your Order' })).toBeInTheDocument();
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.70.00/-');
  expect(chargeRow('Subtotal', 1)).toHaveTextContent('Rs.809.00/-');
  expect(chargeRow('Total', 1)).toHaveTextContent('Rs.879.00/-');

  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());
  const createOrder = api.post.mock.calls.find(([url]) => url.endsWith('/payment/create-order'));
  expect(new URLSearchParams(createOrder[1]).get('client_hint_amount')).toBe('87900');
  await act(async () => { await paymentOptions.handler(paymentResponse); });
  expect(trackPurchase).toHaveBeenCalledWith(expect.objectContaining({ value: 879, shipping: 70 }));
});

test('the supplied normal cart charges four bottles at the sale price without an offer discount', async () => {
  setOudCart(oudNormalQuote);
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.0.00/-'));
  expect(screen.getByText('Rs.569.00/-', { exact: true })).toBeInTheDocument();
  expect(screen.getAllByText('Rs.2276.00/-', { exact: true })).toHaveLength(3);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.2276.00/-');
  expect(chargeRow('Total')).toHaveTextContent('Rs.2276.00/-');
  expect(screen.queryByText('Offer discount', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText(/1 free \(Buy 4 Get 1 Free/)).not.toBeInTheDocument();
});

test('the supplied offer charges four original-price bottles consistently in the cart, confirmation, and payment', async () => {
  setOudCart(oudOfferQuote);
  mountCheckout();

  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.2396.00/-'));
  expect(screen.getByText('Rs.599.00/-', { exact: true })).toBeInTheDocument();
  expect(screen.queryByText('Rs.569.00/-', { exact: true })).not.toBeInTheDocument();
  expect(screen.getAllByText('Rs.2396.00/-', { exact: true })).toHaveLength(2);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.2995.00/-');
  expect(chargeRow('Offer discount')).toHaveTextContent('-Rs.599.00/-');
  expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.0.00/-');
  expect(screen.getByText(/1 free \(Buy 4 Get 1 Free/)).toHaveTextContent('save Rs.599.00/-');

  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your Order' })).toBeInTheDocument();
  expect(screen.getAllByText('Rs.599.00/-', { exact: true })).toHaveLength(2);
  expect(chargeRow('Subtotal', 1)).toHaveTextContent('Rs.2995.00/-');
  expect(chargeRow('Offer discount', 1)).toHaveTextContent('-Rs.599.00/-');
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.0.00/-');
  expect(chargeRow('Total', 1)).toHaveTextContent('Rs.2396.00/-');

  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());
  const createOrder = api.post.mock.calls.find(([url]) => url.endsWith('/payment/create-order'));
  expect(new URLSearchParams(createOrder[1]).get('client_hint_amount')).toBe('239600');
  await act(async () => { await paymentOptions.handler(paymentResponse); });
  expect(trackPurchase).toHaveBeenCalledWith(expect.objectContaining({ value: 2396, shipping: 0 }));
});

test('mixed-product offers use each eligible bottle original price in both summaries and payment while other sizes keep sale pricing', async () => {
  deliveryMethodsResponse = deliveryMethodsWithoutFees;
  setOudCart(mixedOfferQuote);
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.70.00/-'));
  for (const price of [599, 699, 499]) {
    expect(screen.getByText(`Rs.${price}.00/-`, { exact: true })).toBeInTheDocument();
  }
  for (const price of [569, 629, 449, 899]) {
    expect(screen.queryByText(`Rs.${price}.00/-`, { exact: true })).not.toBeInTheDocument();
  }
  expect(screen.getAllByText('Rs.809.00/-', { exact: true })).toHaveLength(2);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.3904.00/-');
  expect(chargeRow('Offer discount')).toHaveTextContent('-Rs.499.00/-');
  expect(chargeRow('Total')).toHaveTextContent('Rs.3475.00/-');
  expect(screen.getAllByText(/1 free \(Buy 4 Get 1 Free/)).toHaveLength(1);
  expect(screen.getByText(/1 free \(Buy 4 Get 1 Free/)).toHaveTextContent('save Rs.499.00/-');

  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your Order' })).toBeInTheDocument();
  for (const price of [599, 699, 499]) {
    expect(screen.getAllByText(`Rs.${price}.00/-`, { exact: true })).toHaveLength(2);
  }
  expect(screen.getAllByText('Rs.809.00/-', { exact: true })).toHaveLength(3);
  expect(screen.getAllByText(/including 1 free/)).toHaveLength(1);
  expect(chargeRow('Subtotal', 1)).toHaveTextContent('Rs.3904.00/-');
  expect(chargeRow('Offer discount', 1)).toHaveTextContent('-Rs.499.00/-');
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.70.00/-');
  expect(chargeRow('Total', 1)).toHaveTextContent('Rs.3475.00/-');

  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());
  const createOrder = api.post.mock.calls.find(([url]) => url.endsWith('/payment/create-order'));
  expect(new URLSearchParams(createOrder[1]).get('client_hint_amount')).toBe('347500');
  await act(async () => { await paymentOptions.handler(paymentResponse); });
  expect(trackPurchase).toHaveBeenCalledWith(expect.objectContaining({ value: 3475, shipping: 70 }));
});

test('an updated mixed-product quote restores all sale prices when the offer ends despite stale context offer data', async () => {
  setOudCart(mixedOfferQuote);
  const view = mountCheckout();
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.3475.00/-'));

  cartQuote = {
    ...mixedOfferQuote,
    total_qty: '5',
    total_amount: 3085,
    free_items: [],
    data: mixedOfferQuote.data.map((item, index) => index === 0 ? { ...item, qty: '1' } : item),
  };
  useCart.mockReturnValue({
    ...cartState,
    items: cartState.items.map((item, index) => index === 0 ? { ...item, qty: 1 } : item),
  });
  view.rerender(checkoutTree());

  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.3155.00/-'));
  for (const [price, occurrences] of [[569, 2], [629, 1], [449, 2]]) {
    expect(screen.getAllByText(`Rs.${price}.00/-`, { exact: true })).toHaveLength(occurrences);
  }
  for (const price of [599, 699, 499]) {
    expect(screen.queryByText(`Rs.${price}.00/-`, { exact: true })).not.toBeInTheDocument();
  }
  expect(screen.getAllByText('Rs.809.00/-', { exact: true })).toHaveLength(2);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.3085.00/-');
  expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.70.00/-');
  expect(screen.queryByText('Offer discount', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText(/1 free \(Buy 4 Get 1 Free/)).not.toBeInTheDocument();
});

test('a newer backend quote replaces the stale offer original price in both order summaries', async () => {
  setOudCart(oudOfferQuote);
  addressesResponse = [
    { id: 1, street: 'India street', city: 'Bengaluru', country: 'India' },
    { id: 2, street: 'Dubai street', city: 'Dubai', country: 'United Arab Emirates' },
  ];
  const updatedQuote = {
    ...oudOfferQuote,
    free_items: [{ ...oudOffer, original_price: 650, discount: 650 }],
  };
  const defaultPost = api.post.getMockImplementation();
  api.post.mockImplementation((url, body, config) => {
    if (url.endsWith('/cart') && new URLSearchParams(body).get('shipping_country') === 'United Arab Emirates') {
      return Promise.resolve({ data: updatedQuote });
    }
    return defaultPost(url, body, config);
  });
  mountCheckout();
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.2396.00/-'));

  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  const continueButton = await screen.findByRole('button', { name: 'Continue' });
  const shippingAddress = screen.getAllByRole('radio', { name: /Dubai street/ }).find((input) => input.name === 'shipping');
  fireEvent.click(shippingAddress);
  fireEvent.click(continueButton);

  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.2600.00/-'));
  expect(screen.getAllByText('Rs.650.00/-', { exact: true })).toHaveLength(2);
  expect(screen.getAllByText('Rs.2600.00/-', { exact: true })).toHaveLength(3);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.3250.00/-');
  expect(chargeRow('Subtotal', 1)).toHaveTextContent('Rs.3250.00/-');
  expect(chargeRow('Offer discount')).toHaveTextContent('-Rs.650.00/-');
  expect(chargeRow('Offer discount', 1)).toHaveTextContent('-Rs.650.00/-');
  expect(chargeRow('Total', 1)).toHaveTextContent('Rs.2600.00/-');
  expect(screen.queryByText('Rs.599.00/-', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Rs.2396.00/-', { exact: true })).not.toBeInTheDocument();
});

test('a backend quote removing the offer restores the sale price despite stale context offer data', async () => {
  setOudCart(oudOfferQuote);
  const view = mountCheckout();
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.2396.00/-'));

  cartQuote = oudNormalQuote;
  useCart.mockReturnValue({
    ...cartState,
    items: [{ ...cartState.items[0], qty: 4 }],
  });
  view.rerender(checkoutTree());

  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.2276.00/-'));
  expect(screen.getByText('Rs.569.00/-', { exact: true })).toBeInTheDocument();
  expect(screen.getAllByText('Rs.2276.00/-', { exact: true })).toHaveLength(3);
  expect(chargeRow('Subtotal')).toHaveTextContent('Rs.2276.00/-');
  expect(screen.queryByText('Offer discount', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText(/1 free \(Buy 4 Get 1 Free/)).not.toBeInTheDocument();
  expect(screen.queryByText('Rs.599.00/-', { exact: true })).not.toBeInTheDocument();
});

test('a successful backend quote synchronizes its authoritative cart snapshot with cart context', async () => {
  setOudCart(oudOfferQuote);
  mountCheckout();

  await waitFor(() => expect(cartState.applyServerCart).toHaveBeenCalledWith(oudOfferQuote));
  expect(chargeRow('Total')).toHaveTextContent('Rs.2396.00/-');
});

test('an explicitly empty backend cart quote clears stale checkout products', async () => {
  cartQuote = {
    status: true,
    delivery_charge: 0,
    total_qty: '0',
    total_amount: 0,
    free_items: [],
    data: [],
  };
  mountCheckout();

  expect(await screen.findByText(/Your cart is empty/)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Perfume' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Place order' })).not.toBeInTheDocument();
  expect(cartState.applyServerCart).toHaveBeenCalledWith(cartQuote);
});

test('explicit free delivery displays zero and leaves absent optional charges out of both summaries', async () => {
  cartQuote = { status: true, delivery_charge: '0', total: '400', data: [cartItem] };
  mountCheckout();

  await waitFor(() => expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.0.00/-'));
  expect(chargeRow('Delivery Charge')).not.toHaveTextContent('Calculated at payment');
  expect(screen.queryByText('Tax', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Packing', { exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
  expect(await screen.findByRole('heading', { name: 'Confirm your Order' })).toBeInTheDocument();
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.0.00/-');
  expect(screen.queryByText('Tax', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Packing', { exact: true })).not.toBeInTheDocument();
});

test('a separate billing country does not change the shipping country used for quotes and checkout', async () => {
  addressesResponse = [
    { id: 1, street: 'Shipping street', city: 'Bengaluru', country: 'India' },
    { id: 2, street: 'Billing street', city: 'Dubai', country: 'United Arab Emirates' },
  ];
  mountCheckout();
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  const continueButton = await screen.findByRole('button', { name: 'Continue' });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Billing address same as shipping' }));
  const billingAddress = screen.getAllByRole('radio', { name: /Billing street/ }).find((input) => input.name === 'billing');
  fireEvent.click(billingAddress);
  expect(billingAddress).toBeChecked();
  const shippingAddress = screen.getAllByRole('radio', { name: /Shipping street/ }).find((input) => input.name === 'shipping');
  expect(shippingAddress).toBeChecked();
  fireEvent.click(continueButton);
  fireEvent.click(screen.getByRole('button', { name: 'Proceed to Checkout' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());

  const quotes = api.post.mock.calls.filter(([url]) => url.endsWith('/cart'));
  expect(quotes.length).toBeGreaterThan(0);
  expect(quotes.map(([_url, body]) => new URLSearchParams(body).get('shipping_country')))
    .toEqual(Array(quotes.length).fill('India'));
  const checkout = api.post.mock.calls.find(([url]) => url.endsWith('/checkout'));
  const payload = new URLSearchParams(checkout[1]);
  expect(payload.get('shipping_country')).toBe('India');
  expect(payload.get('shipping_address')).toBe('1');
  expect(payload.get('billing_address')).toBe('2');
});

test('a pending quote for a new shipping country removes stale fees and blocks payment until the fresh quote arrives', async () => {
  addressesResponse = [
    { id: 1, street: 'India street', city: 'Bengaluru', country: 'India' },
    { id: 2, street: 'Dubai street', city: 'Dubai', country: 'United Arab Emirates' },
  ];
  const pending = deferred();
  const defaultPost = api.post.getMockImplementation();
  api.post.mockImplementation((url, body, config) => {
    if (url.endsWith('/cart') && new URLSearchParams(body).get('shipping_country') === 'United Arab Emirates') {
      return pending.promise;
    }
    return defaultPost(url, body, config);
  });
  mountCheckout();
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.450.00/-'));
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }));
  const continueButton = await screen.findByRole('button', { name: 'Continue' });
  const shippingAddress = screen.getAllByRole('radio', { name: /Dubai street/ }).find((input) => input.name === 'shipping');
  fireEvent.click(shippingAddress);
  fireEvent.click(continueButton);

  const proceed = await screen.findByRole('button', { name: 'Proceed to Checkout' });
  expect(proceed).toBeDisabled();
  expect(chargeRow('Delivery Charge')).toHaveTextContent('Calculating');
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Calculating');
  expect(screen.queryByText('Rs.450.00/-')).not.toBeInTheDocument();
  fireEvent.click(proceed);
  expect(api.post.mock.calls.some(([url]) => url.endsWith('/checkout'))).toBe(false);
  expect(paymentOptions).toBeNull();

  await act(async () => {
    pending.resolve({ data: { status: true, delivery_charge: '90', total: '490', data: [cartItem] } });
  });
  await waitFor(() => expect(proceed).toBeEnabled());
  expect(chargeRow('Delivery Charge')).toHaveTextContent('Rs.90.00/-');
  expect(chargeRow('Delivery Charge', 1)).toHaveTextContent('Rs.90.00/-');
  expect(chargeRow('Total')).toHaveTextContent('Rs.490.00/-');
  expect(chargeRow('Total', 1)).toHaveTextContent('Rs.490.00/-');
  fireEvent.click(proceed);
  await waitFor(() => expect(paymentOptions).not.toBeNull());
  const createOrder = api.post.mock.calls.find(([url]) => url.endsWith('/payment/create-order'));
  expect(new URLSearchParams(createOrder[1]).get('client_hint_amount')).toBe('49000');
});

test.each([
  ['discount', { discount: 50 }, { delivery_charge: '50', total: '400' }],
  ['variant with the same gross subtotal', { items: [{ ...cartItem, id: 11, variantid: '101', name: 'Different perfume' }] }, { delivery_charge: '70', total: '470' }],
  ['quantity with the same gross subtotal', { items: [{ ...cartItem, price: 200, qty: 2 }] }, { delivery_charge: '60', total: '460' }],
  [
    'offer original price with the same quantity and discount',
    { freeItems: [{ pid: '10', vid: '100', free_qty: 1, original_price: 500, discount: 0 }] },
    {
      delivery_charge: '50',
      total: '550',
      free_items: [{ pid: '10', vid: '100', free_qty: 1, original_price: 500, discount: 0 }],
    },
    { freeItems: [{ pid: '10', vid: '100', free_qty: 1, original_price: 400, discount: 0 }] },
  ],
])('requests a fresh quote after changing %s instead of retaining the old payable total', async (_name, changedCart, freshQuote, initialCart = {}) => {
  useCart.mockReturnValue({ ...cartState, ...initialCart });
  const view = mountCheckout();
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent('Rs.450.00/-'));
  const currentCart = useCart.mock.results[useCart.mock.results.length - 1].value;
  const quoteCount = api.post.mock.calls.filter(([url]) => url.endsWith('/cart')).length;
  const pending = deferred();
  const defaultPost = api.post.getMockImplementation();
  api.post.mockImplementation((url, body, config) => url.endsWith('/cart')
    ? pending.promise
    : defaultPost(url, body, config));
  useCart.mockReturnValue({ ...currentCart, ...changedCart });
  view.rerender(checkoutTree());

  await waitFor(() => expect(api.post.mock.calls.filter(([url]) => url.endsWith('/cart')).length)
    .toBeGreaterThan(quoteCount));
  expect(chargeRow('Delivery Charge')).toHaveTextContent('Calculating');
  expect(screen.queryByText('Rs.450.00/-')).not.toBeInTheDocument();
  await act(async () => {
    pending.resolve({ data: { status: true, ...freshQuote, data: changedCart.items ?? currentCart.items } });
  });
  await waitFor(() => expect(chargeRow('Total')).toHaveTextContent(`Rs.${Number(freshQuote.total).toFixed(2)}/-`));
  expect(chargeRow('Delivery Charge')).toHaveTextContent(`Rs.${Number(freshQuote.delivery_charge).toFixed(2)}/-`);
});

test('payment verification uses the shared client with multipart data and requires the user session', async () => {
  await openPayment();
  localStorage.setItem('authToken', 'different-account-token');
  await act(async () => { await paymentOptions.handler(paymentResponse); });

  const callback = api.post.mock.calls.find(([url]) => url.endsWith('/payment/callback'));
  expect(callback[1]).toBeInstanceOf(FormData);
  expect(Object.fromEntries(callback[1])).toEqual({
    userid: '7', order_id: '25', porder_id: 'order_test123',
    payment_id: 'pay_test123', signature: 'test-signature',
  });
  expect(callback[2]).toEqual({ requireUser: true, expectedUserToken: 'current-token' });
  expect(trackPurchase).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith('/order-confirmation', expect.any(Object));
});

test('rejected payment verification cannot report a successful purchase', async () => {
  await openPayment();
  api.post.mockRejectedValueOnce({ response: { status: 403, data: { error: 'Token expired' } }, message: 'Request failed' });
  await act(async () => { await paymentOptions.handler(paymentResponse); });

  expect(trackPurchase).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('guest checkout and payment keep guest authentication after a different account logs in', async () => {
  useAuth.mockReturnValue({ user: null, token: '' });
  localStorage.setItem('guest_address', JSON.stringify({
    name: 'Guest', email: 'guest@example.com', phone: '9000000000',
    street: 'Test street', city: 'Test city', pincode: '560001', district: 'Test district',
    state: 'Test state', country: 'India',
  }));
  mountCheckout();
  fireEvent.click(screen.getByRole('button', { name: 'Checkout as Guest' }));
  fireEvent.click(screen.getByRole('button', { name: 'Place Guest Order' }));
  await waitFor(() => expect(paymentOptions).not.toBeNull());

  localStorage.setItem('authToken', 'different-account-token');
  await act(async () => { await paymentOptions.handler(paymentResponse); });

  const guestRequests = api.post.mock.calls.filter(([url]) => /\/(guest-checkout|guest-payment\/)/.test(url));
  expect(guestRequests).toHaveLength(3);
  expect(guestRequests.every(([_url, _body, config]) => config.authMode === 'guest')).toBe(true);
  expect(guestRequests[2][1]).toBeInstanceOf(FormData);
});
