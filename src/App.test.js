import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function guestJwt(subject = 'guest') {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=/g, '')
    .replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: Math.floor(Date.now() / 1000) + 3600, sub: subject })}.c2lnbmF0dXJl`;
}

describe('application startup', () => {
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

  test.each([
    { navigation: 'desktop', profileIndex: 0, userShape: 'id' },
    { navigation: 'mobile', profileIndex: 1, userShape: 'id' },
    { navigation: 'desktop', profileIndex: 0, userShape: 'userid' },
    { navigation: 'mobile', profileIndex: 1, userShape: 'userid' },
    { navigation: 'desktop', profileIndex: 0, userShape: 'singleton user_id' },
    { navigation: 'mobile', profileIndex: 1, userShape: 'singleton user_id' },
  ])('keeps the customer signed in when the $navigation profile icon is pressed after OTP login with $userShape', async ({ profileIndex, userShape }) => {
    const customer = { id: 12, name: 'OTP Customer', mobile: '9876543210' };
    const userToken = guestJwt(`otp-customer-${profileIndex}-${userShape}`);
    const loginUser = userShape === 'userid'
      ? { userid: '12', name: customer.name, mobile: customer.mobile }
      : userShape === 'singleton user_id'
        ? [{ user_id: '12', name: customer.name, mobile: customer.mobile }]
        : customer;
    axios.defaults.adapter.mockImplementation((config) => {
      let data = {
        status: true,
        data: config.url.includes('products') ? [product] : [],
        free_items: [],
      };
      if (config.url.endsWith('/login')) {
        const payload = new URLSearchParams(config.data);
        expect(config.__usedUserToken).toBe(false);
        expect(payload.get('mobile')).toBe(customer.mobile);
        if (payload.get('otp_login') === '1') {
          data = { status: true, verify_token: 'verification-token' };
        } else {
          expect(payload.get('otp_login')).toBe('2');
          expect(payload.get('otp')).toBe('1234');
          expect(payload.get('verify_token')).toBe('verification-token');
          data = { status: true, token: userToken, user: loginUser };
        }
      }
      if (config.url.endsWith('/cart')) {
        // The automatic post-login cart refresh must use the new account,
        // rather than the guest ID left over from the login render.
        expect(new URLSearchParams(config.data).get('userid')).toBe(String(customer.id));
        expect(config.headers.Authorization).toBe(`Bearer ${userToken}`);
      }
      return Promise.resolve({ config, data, status: 200, statusText: 'OK', headers: {} });
    });

    render(<Provider store={store}><App /></Provider>);
    expect(await screen.findByText(product.name)).toBeInTheDocument();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(validate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[profileIndex]);
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Mobile number'), { target: { value: customer.mobile } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    await screen.findByRole('heading', { name: 'Verify OTP' });
    fireEvent.paste(screen.getAllByRole('textbox')[0], {
      clipboardData: { getData: () => '1234' },
    });

    await waitFor(() => expect(localStorage.getItem('authToken')).toBe(userToken));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Verify OTP' })).not.toBeInTheDocument());
    await waitFor(() => expect(axios.defaults.adapter.mock.calls.some(([config]) => config.url.endsWith('/cart'))).toBe(true));
    const [firstCartRequest] = axios.defaults.adapter.mock.calls.find(([config]) => config.url.endsWith('/cart'));
    expect(new URLSearchParams(firstCartRequest.data).get('userid')).toBe('12');
    expect(firstCartRequest.headers.Authorization).toBe(`Bearer ${userToken}`);

    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[profileIndex]);
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.getByText(customer.name)).toBeInTheDocument();
    expect(screen.getByText(customer.mobile)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/user-profile');
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send OTP' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('img', { name: 'Ikonix logo' }).closest('a'));
    expect(await screen.findByText(product.name)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[profileIndex]);
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Verify OTP' })).not.toBeInTheDocument();
    expect(axios.defaults.adapter.mock.calls.filter(([config]) => config.url.endsWith('/login'))).toHaveLength(2);
    expect(localStorage.getItem('authToken')).toBe(userToken);
    expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
    for (const [request] of axios.defaults.adapter.mock.calls.filter(([config]) => config.url.endsWith('/cart'))) {
      expect(new URLSearchParams(request.data).get('userid')).toBe('12');
      expect(request.headers.Authorization).toBe(`Bearer ${userToken}`);
    }
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

  test('restores the signed-in profile after a browser refresh without asking for OTP', async () => {
    const userToken = guestJwt('customer');
    const guestToken = guestJwt();
    const customer = { id: 12, name: 'Refresh Customer', mobile: '9876543210' };
    localStorage.setItem('authToken', userToken);
    localStorage.setItem('authUser', JSON.stringify(customer));
    localStorage.setItem('guestToken', guestToken);
    localStorage.setItem('guestTokenTime', String(Date.now()));
    window.history.replaceState({}, '', '/user-profile');

    const firstLoad = render(<Provider store={store}><App /></Provider>);
    expect(await screen.findByText(customer.name)).toBeInTheDocument();
    await waitFor(() => expect(axios.defaults.adapter).toHaveBeenCalledTimes(1));
    firstLoad.unmount();

    render(<Provider store={store}><App /></Provider>);
    expect(await screen.findByText(customer.name)).toBeInTheDocument();
    expect(screen.getByText(customer.mobile)).toBeInTheDocument();
    await waitFor(() => expect(axios.defaults.adapter).toHaveBeenCalledTimes(2));

    expect(window.location.pathname).toBe('/user-profile');
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send OTP' })).not.toBeInTheDocument();
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe(userToken);
    expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
    expect(localStorage.getItem('guestToken')).toBe(guestToken);
    for (const [request] of axios.defaults.adapter.mock.calls) {
      expect(request.url).toContain('/cart');
      expect(request.headers.Authorization).toBe(`Bearer ${userToken}`);
    }
    expect(unhandled).not.toHaveBeenCalled();
  });

  test('loads public product details with the guest credential while keeping the restored customer session', async () => {
    const userToken = guestJwt('product-customer');
    const guestToken = guestJwt();
    const customer = { id: 12, name: 'Product Customer' };
    localStorage.setItem('authToken', userToken);
    localStorage.setItem('authUser', JSON.stringify(customer));
    localStorage.setItem('guestToken', guestToken);
    localStorage.setItem('guestTokenTime', String(Date.now()));
    window.history.replaceState({}, '', '/product-details/1?vid=1');

    axios.defaults.adapter.mockImplementation((config) => {
      const isDetail = config.url.endsWith('/products/1');
      const response = {
        config,
        data: { status: true, data: isDetail ? product : [], free_items: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
      };
      if (isDetail && config.headers.Authorization === `Bearer ${userToken}`) {
        return Promise.reject(Object.assign(new Error('Public catalog requires a guest credential'), {
          config,
          response: { ...response, status: 401, data: { error: 'Invalid token' } },
        }));
      }
      return Promise.resolve(response);
    });
    render(<Provider store={store}><App /></Provider>);

    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();
    const [detailRequest] = axios.defaults.adapter.mock.calls.find(([config]) => config.url.endsWith('/products/1'));
    expect(detailRequest.headers.Authorization).toBe(`Bearer ${guestToken}`);
    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send OTP' })).not.toBeInTheDocument();
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem('authToken')).toBe(userToken);
    expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
