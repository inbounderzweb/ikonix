// Missing charges must stay unknown; converting them to zero implies free delivery.
export function parseCharge(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function normalizeCheckoutCharges(response) {
  const envelope = response && typeof response === 'object' && !Array.isArray(response)
    ? response
    : {};
  // /cart returns its line items in `data`; summary fields sit alongside them.
  // Some responses instead wrap the summary in a `data` object.
  const nested = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
    ? envelope.data
    : {};
  const sources = envelope.status === false || envelope.success === false ? [] : [envelope, nested];
  const readAmount = (keys) => {
    for (const source of sources) {
      for (const key of keys) {
        const amount = parseCharge(source[key]);
        if (amount !== null) return amount;
      }
    }
    return null;
  };
  return {
    delivery: readAmount(['delivery_charge', 'delivery', 'shipping_charge']),
    tax: readAmount(['tax', 'tax_charge']),
    packing: readAmount(['packing', 'packing_charge']),
    // In the supplied /cart response, total_amount is 809 for an 809 sale-price
    // item, with delivery_charge 70 separate. It is not the 879 payable total.
    apiTotal: readAmount(['total', 'total_charge', 'grand_total']) ?? 0,
    raw: response,
  };
}
