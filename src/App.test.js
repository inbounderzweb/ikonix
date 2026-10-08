import { cleanup, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import axios from 'axios';
import App from './App';
import { productApi } from './features/product/productApi';

// Keep real Axios clients and interceptors. Setting the adapter before App's
// imports run also captures the product client's requests without network I/O.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios').default;
  actual.defaults.adapter = jest.fn();
  return { __esModule: true, default: actual };
});

const product = {
  id: 1,
  name: 'Smoke Test Fragrance',
  category_name: 'Best Sellers',
  image: '/test-fragrance.png',
  variants: [{ vid: '1', price: 100, sale_price: 90, weight: '30ml' }],
};

function guestJwt() {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=/g, '')
    .replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: Math.floor(Date.now() / 1000) + 3600 })}.c2lnbmF0dXJl`;
}

describe('application guest startup', () => {
  let store;
  let validate;
  let unhandled;

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // CRA resets mock implementations before each test, including the
    // matchMedia polyfill installed by setupTests.js.
    jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    validate = jest.spyOn(axios, 'post');
    validate.mockResolvedValue({ data: { token: guestJwt() } });
    axios.defaults.adapter.mockReset();
    axios.defaults.adapter.mockImplementation((config) => Promise.resolve({
      config,
      data: {
        status: true,
        data: config.url.includes('products') ? [product] : [],
        free_items: [],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
    }));
    store = configureStore({
      reducer: { [productApi.reducerPath]: productApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(productApi.middleware),
    });
    unhandled = jest.fn();
    window.addEventListener('unhandledrejection', unhandled);
  });

  afterEach(() => {
    cleanup();
    store.dispatch(productApi.util.resetApiState());
    window.removeEventListener('unhandledrejection', unhandled);
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('renders the guest storefront and products with the real Redux and auth providers', async () => {
    const token = guestJwt();
    localStorage.setItem('guestToken', token);
    localStorage.setItem('guestTokenTime', String(Date.now()));
    render(<Provider store={store}><App /></Provider>);

    expect(await screen.findByText(product.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ikonix logo' })).toBeInTheDocument();
    const productsRequest = axios.defaults.adapter.mock.calls.find(([config]) => config.url.includes('products'));
    expect(productsRequest[0].headers.Authorization).toBe(`Bearer ${token}`);
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(unhandled).not.toHaveBeenCalled();
  });

  test('shows a retry when guest authentication fails without sending tokenless requests or leaking a preload rejection', async () => {
    validate.mockRejectedValue(Object.assign(new Error('Guest authentication unavailable'), {
      response: { status: 403, data: { error: 'Forbidden' } },
    }));
    render(<Provider store={store}><App /></Provider>);

    expect(await screen.findByText('Error loading products.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ikonix logo' })).toBeInTheDocument();
    expect(validate).toHaveBeenCalledTimes(1);
    expect(axios.defaults.adapter).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBeNull();
  });
});
