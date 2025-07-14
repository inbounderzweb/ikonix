// src/pages/checkout/CheckoutPage.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function CheckoutPage() {
  const { state } = useLocation();
  const [cartItems, setCartItems] = useState([]);

  /*  Whenever location.state changes, copy fresh items  */
  useEffect(() => {
    if (state?.cartItems) {
      setCartItems(state.cartItems.map(it => ({ ...it, qty: Number(it.qty) })));
    }
  }, [state]);

  const inc = cartid =>
    setCartItems(prev => prev.map(it =>
      it.cartid === cartid ? { ...it, qty: it.qty + 1 } : it
    ));

  const dec = cartid =>
    setCartItems(prev => prev.map(it =>
      it.cartid === cartid ? { ...it, qty: Math.max(1, it.qty - 1) } : it
    ));

  const total = cartItems.reduce((sum,it)=>
    sum + parseFloat(it.price)*it.qty ,0
  );

  if (!cartItems.length) return <p className="text-center mt-10">Your cart is empty.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>

      <div className="grid gap-4">
        {cartItems.map(item=>(
          <div key={item.cartid} className="flex p-4 border rounded shadow gap-4 items-center">
            <img src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`} alt={item.name} className="w-24 h-24 rounded object-cover"/>
            <div className="flex-1">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
              <div className="flex gap-2 mt-2 items-center">
                <button onClick={()=>dec(item.cartid)} className="px-2 py-1 bg-gray-200 rounded">−</button>
                <span>{item.qty}</span>
                <button onClick={()=>inc(item.cartid)} className="px-2 py-1 bg-gray-200 rounded">+</button>
              </div>
              <p className="text-sm mt-2 font-medium text-gray-700">
                ₹{parseFloat(item.price).toFixed(2)} × {item.qty} = ₹{(parseFloat(item.price)*item.qty).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 border rounded shadow text-right text-lg font-semibold">
        Total Amount: ₹{total.toFixed(2)}
      </div>

      <button className="w-full mt-6 bg-blue-600 text-white py-3 rounded text-lg">
        Proceed to Payment
      </button>
    </div>
  );
}
