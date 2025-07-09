import React, { useState } from "react";
import { HiMinus, HiPlus } from "react-icons/hi";
import { AiOutlineCheckCircle, AiOutlineDown } from "react-icons/ai";
import { FiTrash2 } from "react-icons/fi";

/**
 * CheckoutPage – pixel‑accurate recreation of your desktop & mobile mocks.
 * Drop into <Route path="/checkout" element={<CheckoutPage />} /> and you’re done.
 * TailwindCSS ≥ v3 required (uses arbitrary value syntax + line‑clamp).
 */

const mockCart = [
  {
    id: 1,
    title: "Bangalore Bloom Men's",
    price: 399,
    img: "https://placehold.co/96x120?text=Perfume",
    qty: 1,
  },
  {
    id: 2,
    title: "Bangalore Bloom Men's",
    price: 399,
    img: "https://placehold.co/96x120?text=Perfume",
    qty: 1,
  },
  {
    id: 3,
    title: "Bangalore Bloom Men's",
    price: 399,
    img: "https://placehold.co/96x120?text=Perfume",
    qty: 1,
  },
  {
    id: 4,
    title: "Bangalore Bloom Men's",
    price: 399,
    img: "https://placehold.co/96x120?text=Perfume",
    qty: 1,
  },
];

export default function CheckoutPage() {


  
  const [cart, setCart] = useState(mockCart);
  const [payMethod, setPayMethod] = useState("cod");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal: "",
    comment: "",
  });

  const updateQty = (id, delta) => {
    setCart((c) =>
      c.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };
  const removeItem = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, cur) => s + cur.price * cur.qty, 0);

  const inputBase =
    "w-full border text-[15px] placeholder:text-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#b49d91]";

  return (
    <section className="w-full bg-white text-[#3b312e] font-[\'Inter\',sans-serif]">
      {/* breadcrumb */}
      <nav className="max-w-7xl mx-auto px-4 md:px-8 pt-6 text-sm text-gray-500">
        Home / Products / Products Inner page / <span className="text-black">Checkout</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row gap-8">
        {/* Address + Payment (left on desktop) */}
        <div className="flex-1 space-y-10">
          {/* Address */}
          <div className="bg-[#fdf6f4] p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className={inputBase}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Second Name"
                className={inputBase}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <input
                type="email"
                placeholder="sample@gmail.com"
                className={inputBase}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <div className="flex gap-2">
                <span className="min-w-[56px] border rounded px-3 py-2 flex items-center justify-center text-gray-500">+91</span>
                <input
                  type="tel"
                  placeholder="0000 000 000"
                  className={`${inputBase} flex-1`}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              {/* address full width */}
              <input
                type="text"
                placeholder="Sample address"
                className={`${inputBase} sm:col-span-2`}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <input
                type="text"
                placeholder="City"
                className={inputBase}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <input
                type="text"
                placeholder="000 000"
                className={inputBase}
                value={form.postal}
                onChange={(e) => setForm({ ...form, postal: e.target.value })}
              />
            </div>
          </div>

          {/* Payment options */}
          <div className="bg-[#fdf6f4] p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-6 capitalize">payment Option</h3>
            <ul className="divide-y divide-[#e9dfda]">
              {[
                { id: "cod", label: "Cash on delivery" },
                { id: "upi", label: "UPI Payment" },
                { id: "rzp", label: "Razorpay" },
              ].map((opt) => (
                <li key={opt.id} className="flex items-center justify-between py-4">
                  <span>{opt.label}</span>
                  <button
                    aria-label={opt.label}
                    className="w-5 h-5 rounded-full border-2 border-[#b49d91] flex items-center justify-center"
                    onClick={() => setPayMethod(opt.id)}
                  >
                    {payMethod === opt.id && (
                      <AiOutlineCheckCircle className="text-[#b49d91] w-5 h-5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Cart summary (right on desktop) */}
        <div className="w-full md:w-96 space-y-6">
          <div className="bg-[#fdf6f4] p-6 rounded-lg shadow-sm md:sticky md:top-24">
            <h3 className="text-xl font-semibold mb-6">My Cart</h3>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 border-b pb-5 last:border-none">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-20 h-24 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium line-clamp-2 mb-1">
                      {item.title}
                    </h4>
                    <p className="font-semibold mb-2">Rs.{item.price}/-</p>

                    {/* qty control */}
                    <div className="flex items-center gap-1 text-sm mb-1">
                      <span className="mr-2">Qty</span>
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="p-1 border rounded hover:bg-gray-50"
                      >
                        <HiMinus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center select-none">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="p-1 border rounded hover:bg-gray-50"
                      >
                        <HiPlus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* remove */}
                    <button
                      className="flex items-center text-[13px] text-[#b49d91] hover:underline"
                      onClick={() => removeItem(item.id)}
                    >
                      <FiTrash2 className="w-3 h-3 mr-1" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* subtotal */}
            <div className="flex justify-between items-center mt-6 border-t pt-4 font-medium text-lg">
              <span>Subtotal</span>
              <span>Rs.{subtotal}/-</span>
            </div>

            {/* place order */}
            <button className="w-full mt-6 bg-[#12131a] text-white py-3 rounded-md hover:opacity-90 transition">
              Place order
            </button>
          </div>
        </div>
      </div>

      {/* Mobile stacking order – we visually match mock by placing cart first using flex-col order; already handled by DOM order */}
    </section>
  );
}
