import { normalizeCheckoutCharges, parseCharge } from './checkoutCharges';

test('reads summary fields beside the cart items array', () => {
  expect(normalizeCheckoutCharges({
    status: true,
    delivery_charge: '75', tax: '18', packing: '12', total: '505',
    data: [{ price: 400, qty: 1 }],
  })).toMatchObject({ delivery: 75, tax: 18, packing: 12, apiTotal: 505 });
});

test('reads the supplied delivery fee without treating the cart amount as the grand total', () => {
  expect(normalizeCheckoutCharges({
    status: true, message: 'Success', delivery_charge: '70',
    total_qty: '1', total_amount: 809, free_items: [],
    data: [{ cartid: '168', id: '92', vid: '58', qty: '1', price: '899', sale_price: '809', weight: '50' }],
  })).toMatchObject({ delivery: 70, tax: null, packing: null, apiTotal: 0 });
});

test('supports a summary wrapped in data without losing its fee or grand total', () => {
  expect(normalizeCheckoutCharges({
    status: true,
    data: { shipping_charge: '100', tax_charge: '20', packing_charge: '10', grand_total: '530' },
  })).toMatchObject({ delivery: 100, tax: 20, packing: 10, apiTotal: 530 });
});

test('preserves explicit zero delivery even when a nested response has another fee', () => {
  expect(normalizeCheckoutCharges({
    delivery_charge: 0, data: { delivery_charge: 100 },
  }).delivery).toBe(0);
});

test('an unquoted fee remains unknown instead of becoming free delivery', () => {
  expect(normalizeCheckoutCharges({ status: true, data: [] })).toMatchObject({
    delivery: null, tax: null, packing: null, apiTotal: 0,
  });
});

test('a rejected quote cannot report its placeholder zero as free delivery', () => {
  expect(normalizeCheckoutCharges({
    status: false, message: 'Unable to calculate delivery', delivery_charge: 0, total: 400,
  })).toMatchObject({ delivery: null, apiTotal: 0 });
});

test('does not interpret the undocumented cart total_amount as a payable grand total', () => {
  expect(normalizeCheckoutCharges({
    delivery_charge: 75, total_amount: 400, data: [],
  })).toMatchObject({ delivery: 75, apiTotal: 0 });
});

test.each([undefined, null, '', ' ', false, {}, [], 'Unavailable', 'NaN', Infinity, -50])(
  'does not render an invalid charge as zero or NaN (%p)',
  (value) => expect(parseCharge(value)).toBeNull()
);

test.each([[0, 0], ['0', 0], ['75.50', 75.5]])(
  'accepts a backend numeric charge including free delivery (%p)',
  (value, expected) => expect(parseCharge(value)).toBe(expected)
);
