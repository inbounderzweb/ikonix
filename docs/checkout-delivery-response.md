# Checkout delivery fee findings

Live API responses inspected on 2026-10-06, using the existing guest credential.
No orders or payments were created and no cart items were added or removed.

`GET /beta/api/delivery-methods` returned HTTP 200:

```json
{
  "status": true,
  "message": "Success",
  "data": [
    { "id": "1", "country": "India", "method": "Normal Delivery", "min_days": "7", "max_days": "10" },
    { "id": "2", "country": "India", "method": "Fast Delivery", "min_days": "3", "max_days": "5" }
  ]
}
```

Neither method contains a charge, price, amount, or delivery_charge field. This
endpoint cannot supply a guest delivery price. Previously the frontend defaulted
the missing amount to zero, which incorrectly implied free delivery.

A read of `POST /beta/api/cart` with `userid=0`, `delivery_method=1`, and
`shipping_country=India` returned HTTP 200 with `delivery_charge: 0` and `data: []`.
The response keys were `status`, `message`, `delivery_charge`, `total_qty`,
`total_amount`, `free_items`, and `data`. That empty shared server cart cannot
quote the items held in a visitor's local guest cart. Do not call it to estimate
guest fees or treat its zero fee as a quote for a populated local cart.

The main checkout summary rendered only merchandise subtotal, offer discount,
and merchandise total. Its only Delivery Charge row was in the signed-in
confirmation modal, so guests never saw it. Summary normalization also read tax,
packing, and grand total from `data` even when `data` was the cart items array.

The fix displays delivery and known extra charges in the main checkout summary,
reads charges from the response envelope or a nested summary object, and uses
the same payable total in the summary and payment amount hint. Explicit zero is
preserved. Missing delivery fees show "Calculated at payment" for guests or
"Unavailable" for account quotes, rather than displaying an invented zero.
Totals with unquoted delivery are labeled "Estimated Total". Account quotes are
invalidated when the destination, method, cart contents, or discount changes;
final account checkout waits for the current quote request to finish.
The shipping country comes from the shipping address, even when billing differs.

For a reliable guest fee before order placement, the backend must provide a
documented quote endpoint accepting guest items, delivery method, and shipping
destination, or include documented price rules in delivery-methods. No such
contract is present in this repository.

The subsequently supplied populated `/cart` response confirms this example:

```json
{
  "status": true,
  "delivery_charge": "70",
  "total_qty": "1",
  "total_amount": 809,
  "free_items": [],
  "data": [{ "cartid": "168", "id": "92", "vid": "58", "qty": "1", "price": "899", "sale_price": "809", "weight": "50" }]
}
```

For this response the merchandise amount is 809, delivery is 70, and payable
total is 879. `total_amount` excludes the separate delivery charge here, so it
must not override the payable total as though it were a grand total. The checkout
reads the fee directly from the response envelope, not from the items array or
delivery-methods. Regression tests cover the fee in both summaries, the 87900
paise payment amount hint, and verified purchase tracking with shipping 70.
The additional offer response supplied on 2026-10-07 has `qty: "5"`,
`price: "599"`, `sale_price: "569"`, and one matching `free_items` row with
`original_price: 599`, `free_qty: 1`, `discount: 599`, and `final_price: 0`.
The user confirmed that offers use the matching offer's `original_price` for
the qualifying cart line. The five bottles already include the free bottle:
subtotal is 2995, offer discount is 599, and merchandise payable is 2396.
Without the offer, four bottles use sale price 569 and total 2276.

That offer response reports `total_amount: 0` despite four paid bottles. The
checkout therefore calculates merchandise from the current item and offer
fields; it continues to reserve `total`, `total_charge`, and `grand_total` for
an explicitly quoted payable total. Delivery and other charges are added
separately when no payable total is supplied.

Cart and checkout share the pricing calculation. Product and variant IDs identify
the free bottle, and an explicit offer discount is an aggregate amount applied
once to that line. An active offer also switches the other products of the same
bottle size to their own backend original prices. The size comes from the
offer's `variant_value`, falling back to the matching free bottle's `weight`.
Other sizes keep their sale prices. Missing size information does not extend
pricing to other products. Conflicting sizes, unmatched product/variant IDs,
invalid free quantities, nonzero final prices, and malformed discounts do not
activate an offer. The backend remains responsible for qualification
and selecting the free bottle; the frontend does not invent offers from quantity.
Priced rows preserve their normal unit price so repeated calculations and offer
removal remain consistent, including prices supplied through `discount_price`.
Checkout uses the items and offers from the latest successful delivery quote
and updates the shared cart from that snapshot, so its quantity controls,
product rows, confirmation, and payment amount use the same cart state.
An explicitly empty quoted cart clears stale items.
Price and offer changes invalidate the quote even when quantity stays the same.
Removing an offer restores the sale price.

The response supplied on 2026-10-08 contains five 30 ml Marj bottles and one
100 ml Oud Maracujá bottle. Only Marj (`pid: "98"`, `vid: "75"`) has a free
bottle: its subtotal is 2995 and its discount is 599, leaving 2396. The unrelated
100 ml bottle uses sale price 1316 despite having `original_price: 1549`, so
merchandise payable is 3712. With no valid `free_items`, both lines use sale
prices and payable becomes 4161. An item-level `original_price` supplies the
original price of an eligible product; its presence alone never activates an
offer or makes that product free.

Pricing exposes only the matched, validated offer rows with the free quantities
and discounts actually applied. Cart banners, per-product labels, celebrations,
and checkout share these rows. Complete product-add, quantity-change, and removal
responses replace cart pricing immediately. A background refresh reconciles
concurrent product changes and acknowledgment-only responses. A new cart
snapshot with omitted, null, or malformed `free_items`
clears prior offers. Explicitly failed responses cannot replace a successful
cart or quote, including failure flags encoded as strings or numbers.

Qualifying product-add and increment responses request the existing cart
congratulations and confetti with `celebrateOffer: true`. Only validated free
bottles trigger it, including when the free quantity is unchanged from an earlier
addition. Passive cart reads and checkout quotes do not replay celebrations.
Acknowledgment-only additions carry the same request into their following cart
refresh; queued refreshes preserve it. Clearing the cart cancels pending
celebration refreshes. The banner names the free product and its size.

The subsequent seven-bottle response designates one 30 ml Sauvage bottle as
free (`pid: "88"`, `vid: "45"`). Its existing cart row has quantity 2, so it
remains one row with 1 paid bottle and 1 free bottle at zero cost, saving 499.
The row total is 499; the six product rows contain seven bottles overall.
Subtotal is 3993, discount is 499, and payable is 3494. Free quantities are
already included in the backend quantities; they are never added a second time.
