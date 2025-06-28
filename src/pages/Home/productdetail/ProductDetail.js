import React, { useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { BsCheckCircleFill } from "react-icons/bs";
import { HiMinus, HiPlus } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
/**
 * ProductDetail – ultra‑accurate recreation of the reference desktop & mobile mocks.
 * 
 * ↳ HOW TO USE
 *   <ProductDetail product={...} />
 *   – Pass in a `product` object with the same shape as `mockProduct` below **or**
 *     replace the mock with your real data‑fetch.
 *   – The component is 100 % responsive – collapses into a single‑column mobile layout
 *     at < md (≈768 px) exactly like the screenshot you provided.
 */

const mockProduct = {
  id: 1,
  title: "Bangalore Bloom Men’s",
  price: 399,
  volumeOptions: [
    { id: "100ml", label: "100 ml" },
    { id: "150ml", label: "150 ml" },
  ],
  features: [
    "Premium fragrances",
    "Long‑lasting freshness",
    "A perfume for every mood",
    "Perfect for everyday use",
  ],
  rating: 5,
  ratingCount: 90,
  ribbons: [
    "Flat 20% off | No discount code required.",
    "Free Perfume 100 ml on shopping above Rs 1800/‑",
  ],
  mainImages: [
    // 0 → hero, rest → thumbs; use real image URLs / imports.
    "https://placehold.co/600x750?text=Hero+Image",
    "https://placehold.co/96x120?text=Thumb+1",
    "https://placehold.co/96x120?text=Thumb+2",
    "https://placehold.co/96x120?text=Thumb+3",
    "https://placehold.co/96x120?text=Thumb+4",
  ],
  description:
    "Step into a world of unparalleled opulence with Luxurious Elixir, an exquisite fragrance that weaves an enchanting symphony of gold and luxury. This gilded elixir is a celebration of sophistication, crafted with the finest essences and imbued with the allure of precious golden hues. From the first spritz to the lingering dry‑down, Luxurious Elixir promises an intoxicating experience that embodies the essence of lavish indulgence.",
  reviewsBreakdown: {
    5: 100,
    4: 10,
    3: 10,
    2: 10,
    1: 10,
  },
  discoverMore: [
    {
      id: 2,
      title: "Bangalore Bloom Men’s",
      img: "https://placehold.co/360x480?text=Perfume+1",
      price: 399,
      tag: "Mens",
    },
    {
      id: 3,
      title: "Bangalore Bloom Men’s",
      img: "https://placehold.co/360x480?text=Perfume+2",
      price: 399,
      tag: "Mens",
    },
    {
      id: 4,
      title: "Bangalore Bloom Men’s",
      img: "https://placehold.co/360x480?text=Perfume+3",
      price: 399,
      tag: "Mens",
    },
    {
      id: 5,
      title: "Bangalore Bloom Men’s",
      img: "https://placehold.co/360x480?text=Perfume+4",
      price: 399,
      tag: "Mens",
    },
  ],
};

export default function ProductDetail({ product = mockProduct }) {
  const navigate = useNavigate();
  const [selectedImg, setSelectedImg] = useState(product.mainImages[0]);
  const [qty, setQty] = useState(1);
  const [activeVolume, setActiveVolume] = useState(product.volumeOptions[1].id);

  const increment = () => setQty((q) => q + 1);
  const decrement = () => setQty((q) => (q > 1 ? q - 1 : 1));

  return (
    <section className="w-full bg-white text-[#3b312e] font-[\'Inter\',sans-serif]">
      {/* ───── Top area – Gallery + Summary */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-12 flex flex-col lg:flex-row gap-10">
        {/* Gallery */}
        <div className="lg:w-1/2 w-full flex flex-col items-center">
          <div className="w-full aspect-square bg-[#b49d91]/60 rounded-md overflow-hidden shadow-sm">
            <img
              src={selectedImg}
              alt={product.title}
              className="object-cover w-full h-full"
            />
          </div>

          {/* Thumbnails */}
          <div className="mt-4 grid grid-cols-4 gap-4 w-full">
            {product.mainImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImg(img)}
                className={`aspect-square rounded-md overflow-hidden border transition hover:ring-1 hover:ring-[#b49d91] ${
                  selectedImg === img ? "border-[#b49d91]" : "border-transparent"
                }`}
              >
                <img src={img} alt={"thumb" + i} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:w-1/2 w-full flex flex-col gap-4">
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight">
            {product.title}
          </h1>

          {/* Feature bullets */}
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
            {product.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <BsCheckCircleFill className="text-[#b49d91] flex-shrink-0 mt-[3px]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Rating */}
          <div className="flex items-center gap-1 text-sm">
            {Array.from({ length: 5 }).map((_, idx) => (
              <AiFillStar key={idx} className="text-[#b49d91]" />
            ))}
            <span className="ml-2">({product.ratingCount})</span>
            <span className="ml-1 underline cursor-pointer select-none">Reviews and Ratings</span>
          </div>

          {/* Ribbons */}
          <div className="flex flex-col gap-2 pt-2">
            {product.ribbons.map((r, i) => (
              <div
                key={i}
                className="text-[13px] border rounded-full px-3 py-1 inline-flex items-center justify-center text-center w-max bg-[#f9f5f3]"
              >
                {r}
              </div>
            ))}
          </div>

          {/* Price & Quantity */}
          <div className="flex items-center gap-6 pt-2">
            <span className="text-3xl font-semibold">Rs.{product.price}/-</span>
            <div className="flex items-center gap-2">
              <button
                onClick={decrement}
                className="p-2 border rounded-md hover:bg-gray-50"
              >
                <HiMinus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center select-none">{qty}</span>
              <button
                onClick={increment}
                className="p-2 border rounded-md hover:bg-gray-50"
              >
                <HiPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Volume options */}
          <div className="flex gap-3 pt-2">
            {product.volumeOptions.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVolume(v.id)}
                className={`text-sm border rounded-md px-4 py-1.5 transition ${
                  activeVolume === v.id
                    ? "bg-[#b49d91] text-white border-[#b49d91]"
                    : "hover:bg-gray-100"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex gap-4 pt-4">
            <button className="w-full md:w-auto flex-1 bg-[#b49d91] text-white rounded-md py-3 text-center hover:opacity-90 transition shadow-sm">
              Add to Cart
            </button>
            <button onClick={()=>navigate('/checkout')} className="w-full md:w-auto flex-1 bg-[#12131a] text-white rounded-md py-3 text-center hover:opacity-90 transition shadow-sm">
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* ───── Product Details + Reviews (stacked on mobile) */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pb-12 space-y-10">
        {/* Product details */}
        <section className="space-y-4 border-t pt-10">
          <h2 className="text-xl font-semibold">Product Details</h2>
          <p className="leading-7 text-[15px] text-gray-700">
            {product.description}
          </p>
        </section>

        {/* Reviews */}
        <section className="space-y-6 border-t pt-10">
          <h2 className="text-xl font-semibold">Reviews</h2>
          <div className="flex items-center gap-3 text-2xl font-medium">
            {Array.from({ length: 5 }).map((_, idx) => (
              <AiFillStar key={idx} className="text-[#b49d91]" />
            ))}
            <span className="text-lg">5 out of 5</span>
          </div>

          <p className="text-sm text-gray-500">
            99% of reviewers recommend this product
          </p>

          {/* breakdown bars */}
          <div className="space-y-2 max-w-sm">
            {Object.entries(product.reviewsBreakdown).map(([star, pct]) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right">{star} Stars</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#b49d91]"
                    style={{ width: pct + "%" }}
                  />
                </div>
                <span>{pct}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ───── Discover More */}
      <section className="border-t py-12 bg-[#faf6f4]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <h2 className="text-center text-2xl font-semibold mb-8">
            Discover More
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {product.discoverMore.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-md overflow-hidden shadow-sm transition hover:shadow-md"
              >
                <div className="relative w-full aspect-[3/4] bg-[#d1c5bd]/60">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="object-cover w-full h-full"
                  />

                  <span className="absolute top-2 left-2 bg-white/80 text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded">
                    {item.tag}
                  </span>

                  {/* lock icon placeholder (top‑right) */}
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/70" />
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm leading-tight line-clamp-2 min-h-[38px]">
                    {item.title}
                  </h3>
                  <div className="flex justify-between items-end text-[13px]">
                    <span className="line-through text-gray-400">Rs.599/-</span>
                    <span className="font-medium">Rs.{item.price}/-</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
