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

Cart and checkout share the pricing calculation. Offers match both product and
variant IDs, and an explicit offer discount is an aggregate amount applied once.
Checkout uses the items and offers from the latest successful delivery quote
and updates the shared cart from that snapshot, so its quantity controls,
product rows, confirmation, and payment amount use the same cart state.
An explicitly empty quoted cart clears stale items.
Price and offer changes invalidate the quote even when quantity stays the same.
Removing an offer restores the sale price.
