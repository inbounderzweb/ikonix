const axios = require('axios');
const qs = require('qs');

async function testFetch() {
  try {
    const { data } = await axios.post(
      'https://ikonixperfumer.com/beta/api/validate',
      qs.stringify({ email: 'api@ikonix.com', password: 'dvu1Fl]ZmiRoYlx5' })
    );
    const token = data.token;
    
    // add an item
    const addRes = await axios.post('https://ikonixperfumer.com/beta/api/cart', qs.stringify({
      userid: 1, productid: 1, variantid: 1, qty: 1
    }), { headers: { Authorization: `Bearer ${token}` } });
    
    let cartRes = await axios.post('https://ikonixperfumer.com/beta/api/cart', qs.stringify({userid:1}), 
      { headers: { Authorization: `Bearer ${token}` } });
    console.log("Cart before checkout:", cartRes.data.data.length);

    const checkRes = await axios.post('https://ikonixperfumer.com/beta/api/checkout', qs.stringify({
      userid: 1, shipping_address: 1, billing_address: 1, delivery_method: 1
    }), { headers: { Authorization: `Bearer ${token}` } });
    
    console.log("Checkout created order:", checkRes.data.order_id);
    
    // check cart now
    cartRes = await axios.post('https://ikonixperfumer.com/beta/api/cart', qs.stringify({userid:1}), 
      { headers: { Authorization: `Bearer ${token}` } });
    let arr = Array.isArray(cartRes.data.data) ? cartRes.data.data : [];
    console.log("Cart AFTER checkout API:", arr.length);
  } catch(e) {
    console.log(e.response ? e.response.data : e.message);
  }
}
testFetch();
