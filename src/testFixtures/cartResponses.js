export const marjOfferResponse = {
  status: true,
  message: 'Success',
  delivery_charge: 0,
  total_qty: '6',
  total_amount: 0,
  free_items: [{
    pid: '98',
    vid: '75',
    name: 'Inspired By Marj',
    image: '1785419259_1efd440aaa1d3ad397c2.jpeg',
    variant_value: '30',
    free_qty: 1,
    original_price: 599,
    discount: 599,
    final_price: 0,
    offer_label: 'Buy 4 Get 1 Free - buy 4 get 1',
  }],
  data: [
    {
      cartid: '1254',
      id: '98',
      qty: '5',
      name: 'Inspired By Marj',
      image: '1785419259_1efd440aaa1d3ad397c2.jpeg',
      vid: '75',
      price: '599',
      weight: '30',
      sale_price: '569',
      original_price: 599,
    },
    {
      cartid: '1266',
      id: '87',
      qty: '1',
      name: 'Inspired By Oud Maracujá',
      image: '1785412954_447beb2529ecadbe0642.jpeg',
      vid: '44',
      price: '1549',
      weight: '100',
      sale_price: '1316',
      original_price: 1549,
    },
  ],
};

export const sauvOfferResponse = {
  status: true,
  message: 'Success',
  delivery_charge: 0,
  total_qty: '6',
  total_amount: 0,
  free_items: [{
    pid: '88',
    vid: '45',
    name: 'Inspired By Sauvage',
    image: '1785413357_ad779a4563b517ebcb80.jpeg',
    variant_value: '30',
    free_qty: 1,
    original_price: 499,
    discount: 499,
    final_price: 0,
    offer_label: 'Buy 4 Get 1 Free - buy 4 get 1',
  }],
  data: [
    {
      cartid: '1268', id: '87', qty: '1', name: 'Inspired By Oud Maracujá',
      image: '1785412954_447beb2529ecadbe0642.jpeg',
      vid: '42', price: '599', weight: '30', sale_price: '569', original_price: 599,
    },
    {
      cartid: '1269', id: '88', qty: '2', name: 'Inspired By Sauvage',
      image: '1785413357_ad779a4563b517ebcb80.jpeg',
      vid: '45', price: '499', weight: '30', sale_price: '474', original_price: 499,
    },
    {
      cartid: '1270', id: '90', qty: '1', name: 'Inspired By Khamrah Qahwa',
      image: '1785416630_dbf33a1a8b21eb6b4f49.jpeg',
      vid: '51', price: '499', weight: '30', sale_price: '474', original_price: 499,
    },
    {
      cartid: '1271', id: '98', qty: '1', name: 'Inspired By Marj',
      image: '1785419259_1efd440aaa1d3ad397c2.jpeg',
      vid: '75', price: '599', weight: '30', sale_price: '569', original_price: 599,
    },
    {
      cartid: '1272', id: '99', qty: '1', name: 'Inspired By Baccarat rouge extrait',
      image: '1785419536_9c36cff57428e791310b.jpeg',
      vid: '78', price: '699', weight: '30', sale_price: '664', original_price: 699,
    },
  ],
};

export const sevenBottleOfferResponse = {
  ...sauvOfferResponse,
  total_qty: '7',
  data: [...sauvOfferResponse.data, {
    cartid: '1273', id: '86', qty: '1', name: 'Inspired By Stronger With You',
    image: '1785412591_e9845beb20c2fa3c7083.jpeg',
    vid: '39', price: '599', weight: '30', sale_price: '569', original_price: 599,
  }],
};
