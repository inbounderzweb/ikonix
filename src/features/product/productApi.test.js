const NOW = 1800000000000;

function jwt(exp, marker) {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp })}.${btoa(marker).replace(/=/g, '')}`;
}

function response(config, data, status = 200) {
  return { config, data, status, statusText: '', headers: {} };
}

function rejection(config, status, data) {
  const error = new Error('Request failed');
  error.config = config;
  error.response = response(config, data, status);
  return Promise.reject(error);
}

describe('RTK product API authentication', () => {
  let axios;
  let originalAdapter;
  let adapter;
  let validate;
  let productApi;
  let store;
  let guestA;
  let guestB;

  const products = { status: true, data: [{ id: 5, name: 'Perfume' }] };

  function cacheGuest(token) {
    localStorage.setItem('guestToken', token);
    localStorage.setItem('guestTokenTime', String(NOW));
  }

  async function query(endpoint, args) {
    const subscription = store.dispatch(productApi.endpoints[endpoint].initiate(args));
    try {
      return await subscription;
    } finally {
      subscription.unsubscribe();
    }
  }

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    axios = require('axios').default;
    originalAdapter = axios.defaults.adapter;
    adapter = jest.fn((config) => Promise.resolve(response(config, products)));
    axios.defaults.adapter = adapter;
    validate = jest.spyOn(axios, 'post');
    guestA = jwt(NOW / 1000 + 3600, 'guest-a');
    guestB = jwt(NOW / 1000 + 7200, 'guest-b');
    validate.mockResolvedValue({ data: { token: guestB } });

    productApi = require('./productApi').productApi;
    const { configureStore } = require('@reduxjs/toolkit');
    store = configureStore({
      reducer: { [productApi.reducerPath]: productApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(productApi.middleware),
    });
  });

  afterEach(() => {
    if (store) store.dispatch(productApi.util.resetApiState());
    axios.defaults.adapter = originalAdapter;
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('renews an expired guest before GET even while a customer is logged in', async () => {
    cacheGuest(jwt(NOW / 1000 - 1, 'expired-guest'));
    const userToken = jwt(NOW / 1000 + 3600, 'customer');
    localStorage.setItem('authToken', userToken);

    const result = await query('getProducts');

    expect(result.data).toEqual(products);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      url: 'products',
      baseURL: 'https://ikonixperfumer.com/beta/api/',
      method: 'get',
    });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestB}`);
    expect(localStorage.getItem('authToken')).toBe(userToken);
  });

  test('GET renews a server-rejected guest token and returns the retried data', async () => {
    cacheGuest(guestA);
    const sentTokens = [];
    adapter.mockImplementation((config) => {
      sentTokens.push(config.headers.Authorization);
      return sentTokens.length === 1
        ? rejection(config, 403, { error: 'Invalid token' })
        : Promise.resolve(response(config, products));
    });

    const result = await query('getProducts');

    expect(result.data).toEqual(products);
    expect(sentTokens).toEqual([`Bearer ${guestA}`, `Bearer ${guestB}`]);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  test('FormData search preserves every field when a guest token is renewed and retried', async () => {
    cacheGuest(guestA);
    const attempts = [];
    adapter.mockImplementation((config) => {
      attempts.push({
        method: config.method,
        authorization: config.headers.Authorization,
        multipart: config.data instanceof FormData,
        fields: Array.from(config.data.entries()),
      });
      return attempts.length === 1
        ? rejection(config, 403, { error: 'Expired token' })
        : Promise.resolve(response(config, products));
    });

    const result = await query('searchProducts', { search: 'oud & rose', page: 2, limit: 7 });

    expect(result.data).toEqual(products);
    expect(attempts).toEqual([
      {
        method: 'post', authorization: `Bearer ${guestA}`, multipart: true,
        fields: [['page', '2'], ['limit', '7'], ['search', 'oud & rose']],
      },
      {
        method: 'post', authorization: `Bearer ${guestB}`, multipart: true,
        fields: [['page', '2'], ['limit', '7'], ['search', 'oud & rose']],
      },
    ]);
    expect(validate).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['getProducts', undefined],
    ['searchProducts', { search: 'rose' }],
  ])('%s returns a genuine permission 403 without renewing or replaying', async (endpoint, args) => {
    cacheGuest(guestA);
    adapter.mockImplementation((config) => rejection(config, 403, { error: 'Access denied' }));

    const result = await query(endpoint, args);

    expect(result.error).toEqual({ status: 403, data: { error: 'Access denied' } });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem('guestToken')).toBe(guestA);
  });

  test.each([
    ['getProducts', undefined],
    ['searchProducts', { search: 'rose' }],
  ])('%s does not dispatch the resource when guest authentication fails', async (endpoint, args) => {
    validate.mockRejectedValue(Object.assign(new Error('Guest authentication denied'), {
      config: { url: '/beta/api/validate', method: 'post' },
      response: { status: 403, data: { error: 'Forbidden' }, headers: {} },
    }));

    const result = await query(endpoint, args);

    expect(result.error).toEqual({ status: 403, data: { error: 'Forbidden' } });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(adapter).not.toHaveBeenCalled();
    expect(localStorage.getItem('guestToken')).toBeNull();
  });
});
