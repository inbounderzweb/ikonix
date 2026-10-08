const NOW = 1800000000000;

function jwt(payload = {}, marker = "signature") {
  const encode = (value) => btoa(JSON.stringify(value))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.${btoa(marker).replace(/=/g, "")}`;
}

function response(config, data = { status: true }, status = 200) {
  return { config, data, status, statusText: "", headers: {} };
}

function rejection(config, status, data) {
  const error = new Error("Request failed");
  error.config = config;
  error.response = response(config, data, status);
  return Promise.reject(error);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

describe("API authentication and recovery", () => {
  let axios;
  let client;
  let validate;
  let expired;
  let guestA;
  let guestB;
  let userA;
  let userB;

  const cacheGuest = (token, age = 0) => {
    localStorage.setItem("guestToken", token);
    localStorage.setItem("guestTokenTime", String(NOW - age));
  };
  const cacheUser = (token) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify({ id: 7 }));
    localStorage.setItem("authTokenTime", String(NOW));
  };
  const apiWithAdapter = (options = {}, implementation) => {
    const api = client.createApiClient(options);
    api.defaults.adapter = jest.fn(implementation || ((config) => Promise.resolve(response(config))));
    return api;
  };

  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    axios = require("axios").default;
    validate = jest.spyOn(axios, "post");
    validate.mockRejectedValue(Object.assign(new Error("Validate unavailable"), {
      response: { status: 403, data: { error: "Forbidden" } },
    }));
    client = require("./client");
    expired = jest.fn();
    window.addEventListener(client.AUTH_EXPIRED_EVENT, expired);
    guestA = jwt({ exp: NOW / 1000 + 3600 }, "guest-a");
    guestB = jwt({ exp: NOW / 1000 + 7200 }, "guest-b");
    userA = jwt({ exp: NOW / 1000 + 3600 }, "user-a");
    userB = jwt({ exp: NOW / 1000 + 7200 }, "user-b");
  });

  afterEach(() => {
    window.removeEventListener(client.AUTH_EXPIRED_EVENT, expired);
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test("rejects malformed JWTs and expired claims while allowing a valid JWT without exp", () => {
    expect(client.isJwtExpired("not-a-jwt")).toBe(true);
    expect(client.isJwtExpired("a.invalid.c")).toBe(true);
    expect(client.isJwtExpired(null)).toBe(true);
    expect(client.isJwtExpired(jwt({ exp: NOW / 1000 }))).toBe(true);
    expect(client.isJwtExpired(jwt({ exp: NOW / 1000 - 1 }))).toBe(true);
    expect(client.isJwtExpired(userA)).toBe(false);
    expect(client.isJwtExpired(jwt({ sub: "7" }))).toBe(false);
  });

  test("uses the stored user session when no token callback is supplied", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    const api = apiWithAdapter();
    await api.get("/beta/api/products");
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${userA}`);
    expect(validate).not.toHaveBeenCalled();
  });

  test("a long-lived payment callback client reads logout state before dispatch", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    const api = apiWithAdapter();
    await api.post("/beta/api/checkout", {}, { requireUser: true });
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${userA}`);
    client.clearStoredSession();
    await expect(api.post("/beta/api/payment/callback", { payment_id: "payment-123" }, { requireUser: true }))
      .rejects.toMatchObject({ response: { status: 401 } });
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem("guestToken")).toBe(guestA);
  });

  test("an explicit null callback stays guest-only even when a user session is stored", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => null });
    await api.get("/beta/api/products");
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestA}`);
    expect(localStorage.getItem("authToken")).toBe(userA);
  });

  test("guest-only login token recovery preserves a stored user's identity", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    validate.mockResolvedValue({ data: { token: guestB } });
    const seen = [];
    const api = apiWithAdapter({ getToken: () => null }, (config) => {
      seen.push(config.headers.Authorization);
      return seen.length === 1
        ? rejection(config, 403, { error: "Invalid token" })
        : Promise.resolve(response(config));
    });
    await api.post("/beta/api/login", "email=login%40example.com&password=test-password");
    expect(seen).toEqual([`Bearer ${guestA}`, `Bearer ${guestB}`]);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBe(userA);
    expect(localStorage.getItem("authUser")).toBe(JSON.stringify({ id: 7 }));
    expect(expired).not.toHaveBeenCalled();
  });

  test("uses a new stored session instead of a stale callback token", async () => {
    cacheUser(userB);
    const api = apiWithAdapter({ getToken: () => userA });
    await api.post("/beta/api/cart", "userid=7");
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${userB}`);
    expect(validate).not.toHaveBeenCalled();
  });

  test.each([
    ["/beta/api/payment/callback", false],
    ["/beta/api/cart", false],
    ["/beta/api/payment/callback", true],
  ])("blocks a callback for a different user session (%s, old token expired: %s)", async (url, expiredToken) => {
    const expectedToken = expiredToken ? jwt({ exp: NOW / 1000 - 1 }, "old-user") : userA;
    cacheUser(userB);
    const api = apiWithAdapter();
    await expect(api.post(url, "userid=7", { requireUser: true, expectedUserToken: expectedToken }))
      .rejects.toMatchObject({ __sessionChanged: true, response: { status: 409 } });
    expect(api.defaults.adapter).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
    expect(localStorage.getItem("authToken")).toBe(userB);
    expect(localStorage.getItem("authUser")).toBe(JSON.stringify({ id: 7 }));
    expect(expired).not.toHaveBeenCalled();
  });

  test("a guest payment keeps its guest identity through recovery after the visitor logs in", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    validate.mockResolvedValue({ data: { token: guestB } });
    const seen = [];
    const api = apiWithAdapter({}, (config) => {
      seen.push(config.headers.Authorization);
      return seen.length === 1
        ? rejection(config, 401, { error: "Invalid token" })
        : Promise.resolve(response(config));
    });
    await api.post("/beta/api/guest-payment/callback", { payment_id: "guest-payment" }, { authMode: "guest" });
    expect(seen).toEqual([`Bearer ${guestA}`, `Bearer ${guestB}`]);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBe(userA);
    expect(expired).not.toHaveBeenCalled();
  });

  test("a late rejection of the old session preserves a newer login", async () => {
    cacheUser(userA);
    const pending = deferred();
    const dispatched = deferred();
    const api = apiWithAdapter({ getToken: () => userA }, (config) => {
      dispatched.resolve();
      return pending.promise.then(() => rejection(config, 401, { error: "Invalid token" }));
    });
    const request = api.get("/beta/api/orders").catch((error) => error);
    await dispatched.promise;
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    cacheUser(userB);
    pending.resolve();
    const error = await request;
    expect(error.response.status).toBe(401);
    expect(localStorage.getItem("authToken")).toBe(userB);
    expect(localStorage.getItem("authUser")).toBe(JSON.stringify({ id: 7 }));
    expect(expired).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
  });

  test.each(["/orders", "/orders/12", "/address", "/address/12", "/checkout", "/checkout?coupon=SAVE", "/payment/verify"])(
    "blocks guest access to %s before dispatch",
    async (path) => {
      cacheGuest(guestA);
      const api = apiWithAdapter({ getToken: () => null, baseUrl: "/beta/api" });
      await expect(api.post(path, {})).rejects.toMatchObject({ response: { status: 401 } });
      expect(api.defaults.adapter).not.toHaveBeenCalled();
      expect(validate).not.toHaveBeenCalled();
    }
  );

  test("honors requireUser for cart requests before dispatch", async () => {
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => null });
    await expect(api.post("/beta/api/cart", "userid=0", { requireUser: true }))
      .rejects.toMatchObject({ response: { status: 401 } });
    expect(api.defaults.adapter).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
  });

  test.each(["userid=7", { userid: 7 }])(
    "never sends a user cart request with a guest token (%p)",
    async (data) => {
      cacheGuest(guestA);
      const api = apiWithAdapter({ getToken: () => null });
      await expect(api.post("/beta/api/cart", data)).rejects.toMatchObject({ response: { status: 401 } });
      expect(api.defaults.adapter).not.toHaveBeenCalled();
      expect(validate).not.toHaveBeenCalled();
    }
  );

  test.each(["/beta/api/orders", "/beta/api/cart"])(
    "does not reuse a rejected callback token after session expiration (%s)",
    async (url) => {
      cacheUser(userA);
      cacheGuest(guestA);
      const api = apiWithAdapter({ getToken: () => userA }, (config) =>
        rejection(config, 401, { error: "Invalid token" }));
      await expect(api.get("/beta/api/products")).rejects.toBeDefined();
      await expect(api.post(url, "userid=7", { requireUser: true }))
        .rejects.toMatchObject({ response: { status: 401 } });
      expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
      expect(expired).toHaveBeenCalledTimes(1);
      expect(validate).not.toHaveBeenCalled();
    }
  );

  test.each(["/beta/api/guest-checkout", "/beta/api/guest-payment", "/beta/api/cart"])(
    "allows supported guest operations at %s",
    async (url) => {
      cacheGuest(guestA);
      const api = apiWithAdapter({ getToken: () => null });
      await api.post(url, "userid=0");
      expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestA}`);
      expect(validate).not.toHaveBeenCalled();
    }
  );

  test("blocks expired user mutations and emits only one expiration event", async () => {
    const staleUser = jwt({ exp: NOW / 1000 - 1 }, "expired-user");
    cacheUser(staleUser);
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => staleUser });
    const results = await Promise.allSettled([
      api.post("/beta/api/cart", "userid=7", { requireUser: true }),
      api.post("/beta/api/checkout", {}),
    ]);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(api.defaults.adapter).not.toHaveBeenCalled();
    expect(validate).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("authUser")).toBeNull();
    expect(localStorage.getItem("guestToken")).toBe(guestA);
  });

  test("a user token rejection logs out without replaying a mutation as guest", async () => {
    cacheUser(userA);
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => userA }, (config) =>
      rejection(config, 403, { error: "Expired token" }));
    await expect(api.post("/beta/api/cart", "userid=7", { requireUser: true }))
      .rejects.toMatchObject({ response: { status: 403 } });
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBeNull();
  });

  test.each(["guest", "user"])("a plain 403 for %s does not refresh or expire a session", async (identity) => {
    cacheGuest(guestA);
    if (identity === "user") cacheUser(userA);
    const api = apiWithAdapter({ getToken: () => identity === "user" ? userA : null }, (config) =>
      rejection(config, 403, { error: "Forbidden" }));
    await expect(api.get("/beta/api/products")).rejects.toMatchObject({ response: { status: 403 } });
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
    expect(localStorage.getItem("authToken")).toBe(identity === "user" ? userA : null);
  });

  test("WAF HTML is treated as a permission rejection without refreshing a guest", async () => {
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => null }, (config) =>
      rejection(config, 403, "<html><body>Access denied</body></html>"));
    await expect(api.get("/beta/api/products")).rejects.toMatchObject({ response: { status: 403 } });
    expect(validate).not.toHaveBeenCalled();
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
  });

  test.each([
    [401, { error: "Unauthorized" }],
    [403, { error: "Expired token" }],
    [403, { error: "Invalid token" }],
    [403, { code: "TOKEN_EXPIRED", message: "Authentication failed" }],
  ])("refreshes and replays guest authentication failures once (%s, %p)", async (status, data) => {
    cacheGuest(guestA);
    validate.mockResolvedValue({ data: { token: guestB } });
    const seen = [];
    const api = apiWithAdapter({ getToken: () => null }, (config) => {
      seen.push(config.headers.Authorization);
      return seen.length === 1 ? rejection(config, status, data) : Promise.resolve(response(config));
    });
    await expect(api.get("/beta/api/products")).resolves.toMatchObject({ status: 200 });
    expect(seen).toEqual([`Bearer ${guestA}`, `Bearer ${guestB}`]);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guestToken")).toBe(guestB);
    expect(expired).not.toHaveBeenCalled();
  });

  test("a rejected refreshed guest token cannot cause an infinite retry", async () => {
    cacheGuest(guestA);
    validate.mockResolvedValue({ data: { token: guestB } });
    const api = apiWithAdapter({ getToken: () => null }, (config) =>
      rejection(config, 403, { error: "Invalid token" }));
    await expect(api.get("/beta/api/products")).rejects.toMatchObject({ response: { status: 403 } });
    expect(api.defaults.adapter).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenCalledTimes(1);
  });

  test("shares a forced guest refresh across parallel clients", async () => {
    cacheGuest(guestA);
    const pending = deferred();
    validate.mockReturnValue(pending.promise);
    const adapter = (config) => config.headers.Authorization === `Bearer ${guestA}`
      ? rejection(config, 401, { error: "Invalid token" })
      : Promise.resolve(response(config));
    const first = apiWithAdapter({ getToken: () => null }, adapter);
    const second = apiWithAdapter({ getToken: () => null }, adapter);
    const requests = Promise.all([first.get("/beta/api/products"), second.get("/beta/api/cart")]);
    for (let turn = 0; turn < 10; turn++) await Promise.resolve();
    expect(validate).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { token: guestB } });
    await requests;
    expect(validate).toHaveBeenCalledTimes(1);
    expect(first.defaults.adapter).toHaveBeenCalledTimes(2);
    expect(second.defaults.adapter).toHaveBeenCalledTimes(2);
  });

  test("shares initial guest token acquisition and stores the validated JWT", async () => {
    const pending = deferred();
    validate.mockReturnValue(pending.promise);
    const requests = Promise.all([client.ensureGuestTokenReady(), client.ensureGuestTokenReady()]);
    expect(validate).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { token: guestB } });
    await expect(requests).resolves.toEqual([guestB, guestB]);
    expect(localStorage.getItem("guestToken")).toBe(guestB);
    expect(localStorage.getItem("guestTokenTime")).toBe(String(NOW));
  });

  test.each([
    ["malformed JWT", "not-a-jwt"],
    ["expired JWT", jwt({ exp: NOW / 1000 - 1 })],
  ])("replaces a cached guest %s before dispatch", async (_, token) => {
    cacheGuest(token);
    validate.mockResolvedValue({ data: { token: guestB } });
    const api = apiWithAdapter({ getToken: () => null });
    await api.get("/beta/api/products");
    expect(validate).toHaveBeenCalledTimes(1);
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestB}`);
  });

  test("refreshes a guest JWT at the conservative 55 minute cache cutoff", async () => {
    cacheGuest(guestA, 56 * 60 * 1000);
    validate.mockResolvedValue({ data: { token: guestB } });
    const api = apiWithAdapter({ getToken: () => null });
    await api.get("/beta/api/products");
    expect(validate).toHaveBeenCalledTimes(1);
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestB}`);
  });

  test.each([null, "not-a-timestamp", String(NOW + 60000)])(
    "refreshes a guest JWT with an unusable cache timestamp (%p)",
    async (timestamp) => {
      cacheGuest(guestA);
      if (timestamp === null) localStorage.removeItem("guestTokenTime");
      else localStorage.setItem("guestTokenTime", timestamp);
      validate.mockResolvedValue({ data: { token: guestB } });
      const api = apiWithAdapter({ getToken: () => null });
      await api.get("/beta/api/products");
      expect(validate).toHaveBeenCalledTimes(1);
      expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestB}`);
    }
  );

  test.each([null, "malformed", jwt({ exp: NOW / 1000 - 1 })])(
    "never dispatches without a usable guest token when validation fails (%p)",
    async (token) => {
      if (token) cacheGuest(token);
      const api = apiWithAdapter({ getToken: () => null });
      await expect(api.get("/beta/api/products")).rejects.toBeDefined();
      expect(api.defaults.adapter).not.toHaveBeenCalled();
      expect(validate).toHaveBeenCalledTimes(1);
    }
  );

  test.each(["malformed", jwt({ exp: NOW / 1000 - 1 })])(
    "never sends an unusable JWT returned by validate (%p)",
    async (token) => {
      validate.mockResolvedValue({ data: { token } });
      const api = apiWithAdapter({ getToken: () => null });
      await expect(api.get("/beta/api/products")).rejects.toBeDefined();
      expect(api.defaults.adapter).not.toHaveBeenCalled();
      expect(localStorage.getItem("guestToken")).not.toBe(token);
    }
  );

  test("a temporary proactive refresh failure may use a cached guest JWT that is still unexpired", async () => {
    cacheGuest(guestA, 56 * 60 * 1000);
    jest.spyOn(global, "setTimeout").mockImplementation((callback) => { callback(); return 1; });
    validate.mockRejectedValue(Object.assign(new Error("Temporary validate outage"), {
      response: { status: 503, data: { error: "Unavailable" } },
    }));
    const api = apiWithAdapter({ getToken: () => null });
    await api.get("/beta/api/products");
    expect(validate).toHaveBeenCalled();
    expect(api.defaults.adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${guestA}`);
  });

  test("a rejected guest JWT is never reused when forced refresh fails", async () => {
    cacheGuest(guestA);
    const api = apiWithAdapter({ getToken: () => null }, (config) =>
      rejection(config, 403, { error: "Invalid token" }));
    await expect(api.get("/beta/api/products")).rejects.toBeDefined();
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guestToken")).not.toBe(guestA);
    await expect(api.get("/beta/api/products")).rejects.toBeDefined();
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
  });

  test.each([
    { error: "Invalid token" },
    { status: false, error: "Invalid token" },
    { status: false, code: "TOKEN_EXPIRED", message: "Authentication failed" },
  ])("recovers a guest token failure inside HTTP 200 (%p)", async (data) => {
    cacheGuest(guestA);
    validate.mockResolvedValue({ data: { token: guestB } });
    const seen = [];
    const api = apiWithAdapter({ getToken: () => null }, (config) => {
      seen.push(config.headers.Authorization);
      return Promise.resolve(response(config, seen.length === 1 ? data : { status: true }));
    });
    await expect(api.get("/beta/api/products")).resolves.toMatchObject({ data: { status: true } });
    expect(seen).toEqual([`Bearer ${guestA}`, `Bearer ${guestB}`]);
    expect(validate).toHaveBeenCalledTimes(1);
  });

  test("rejects a user token error inside HTTP 200 and expires the user session", async () => {
    cacheUser(userA);
    const api = apiWithAdapter({ getToken: () => userA }, (config) =>
      Promise.resolve(response(config, { error: "Invalid token" })));
    await expect(api.post("/beta/api/checkout", {})).rejects.toBeDefined();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("authToken")).toBeNull();
    expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
  });

  test("auth diagnostics omit JWTs, query values, and raw response bodies", async () => {
    cacheUser(userA);
    const api = apiWithAdapter({ getToken: () => userA }, (config) =>
      rejection(config, 403, { error: "Forbidden", email: "private@example.com", token: userA }));
    await expect(api.get("/beta/api/products?email=private@example.com&password=secret-password"))
      .rejects.toBeDefined();
    expect(console.warn).toHaveBeenCalled();
    const logged = JSON.stringify([...console.warn.mock.calls, ...console.error.mock.calls]);
    expect(logged).not.toContain(userA);
    expect(logged).not.toContain("private@example.com");
    expect(logged).not.toContain("secret-password");
    expect(logged).not.toContain("?email=");
    expect(logged).not.toContain('"body"');
  });

  test("guest acquisition diagnostics do not expose the validate request or response", async () => {
    validate.mockRejectedValue(Object.assign(new Error("Validate unavailable"), {
      config: { url: "/validate?private=secret-value", data: "email=private@example.com&password=secret-password" },
      response: { status: 403, data: { token: userA, email: "private@example.com" } },
    }));
    const api = apiWithAdapter({ getToken: () => null });
    await expect(api.get("/beta/api/products")).rejects.toBeDefined();
    const logged = JSON.stringify([...console.warn.mock.calls, ...console.error.mock.calls]);
    expect(logged).not.toContain(userA);
    expect(logged).not.toContain("private@example.com");
    expect(logged).not.toContain("secret-password");
    expect(logged).not.toContain("secret-value");
  });
});
