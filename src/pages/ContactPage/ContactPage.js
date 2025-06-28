import React, { useState } from "react";
import { FiPhone } from "react-icons/fi";

/**
 * ContactPage – matches your desktop & mobile mock 1‑to‑1.
 * Plug into <Route path="/contact" element={<ContactPage />} />
 */
export default function ContactPage({ illustration = "https://placehold.co/460x380?text=Illustration" }) {
  const [form, setForm] = useState({
    first: "",
    last: "",
    email: "",
    phone: "",
    comment: "",
  });
  const inputBase =
    "w-full border text-[15px] placeholder:text-gray-400 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#b49d91]";

  return (
    <section className="w-full bg-white text-[#3b312e] font-[\'Inter\',sans-serif] pb-20">
      {/* breadcrumb */}
      <nav className="max-w-7xl mx-auto px-4 md:px-8 pt-6 text-sm text-gray-500">
        Home / <span className="text-black">Contact us</span>
      </nav>

      {/* heading */}
      <h1 className="text-center text-[32px] md:text-[36px] font-medium tracking-wide pt-4 pb-8">
        Contact us
      </h1>

      {/* main card */}
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="bg-[#fdf6f4] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center md:items-start">
          {/* illustration – on left desktop, bottom mobile */}
          <img
            src={illustration}
            alt="Customer Support Illustration"
            className="w-full md:w-1/2 max-w-[480px] object-contain order-2 md:order-1"
          />

          {/* form */}
          <form className="flex-1 w-full order-1 md:order-2" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="first" className="text-[13px] font-medium">
                  First Name
                </label>
                <input
                  id="first"
                  type="text"
                  placeholder="First Name"
                  className={inputBase}
                  value={form.first}
                  onChange={(e) => setForm({ ...form, first: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="last" className="text-[13px] font-medium">
                  Second Name
                </label>
                <input
                  id="last"
                  type="text"
                  placeholder="Second Name"
                  className={inputBase}
                  value={form.last}
                  onChange={(e) => setForm({ ...form, last: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-[13px] font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="sample@gmail.com"
                  className={inputBase}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="phone" className="text-[13px] font-medium">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <span className="min-w-[56px] border rounded px-3 py-2 flex items-center justify-center text-gray-500">+91</span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="0000 000 000"
                    className={`${inputBase} flex-1`}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* comment */}
            <div className="flex flex-col gap-1 mt-4">
              <label htmlFor="comment" className="text-[13px] font-medium">
                Comment
              </label>
              <textarea
                id="comment"
                placeholder="Comment"
                rows={4}
                className={`${inputBase} resize-none`}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>

            {/* submit */}
            <button
              type="submit"
              className="mt-6 w-full md:w-auto px-16 bg-[#12131a] text-white py-3 rounded-md hover:opacity-90 transition block mx-auto"
            >
              Submit
            </button>
          </form>
        </div>
      </div>

      {/* floating WhatsApp – visible on md & below (per mocks) */}
      <a
        href="https://wa.me/919000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-4 bottom-4 z-50 w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg md:hidden"
      >
        <FiPhone className="w-6 h-6 text-white" />
      </a>
    </section>
  );
}
