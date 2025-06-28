import React, { useState } from 'react';
import { ReactComponent as Left } from '../../../assets/caretleft.svg';
import { ReactComponent as Right } from '../../../assets/caretright.svg';


import {
  HiOutlineShoppingBag,
} from 'react-icons/hi';
import perfume from '../../../assets/perfume.svg'

const FILTERS = [
  'Our Bestsellers',
  'New Arrival',
  'Mens',
  "Women’s",
  'Unisex'
];

const PRODUCTS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  title: 'Bangalore Bloom',
  category: "Men’s",
  image: perfume,  // ← swap in your real image path
  original: 599,
  price: 399,
  tag: 'Mens'
}));

export default function Products({ currentPage = 1, totalPages = 4 }) {
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  return (
    <section className="bg-white py-8 w-[95%] md:w-[75%] mx-auto">
      {/* Filters */}
      <div className="overflow-x-auto md:overflow-visible">
        <ul className="flex space-x-3 px-4 scrollbar-hide md:justify-start md:px-0">
          {FILTERS.map(f => (
            <li key={f} className="whitespace-nowrap">
              <button
                onClick={() => setActiveFilter(f)}
                className={
                  `px-4 py-2 rounded-full text-sm transition-colors` +
                  (f === activeFilter
                    ? ' bg-[#b48e7f] text-white'
                    : ' border border-[#b48e7f] text-[#b48e7f]')
                }
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Products */}
      <div className="mt-6 overflow-x-auto md:overflow-visible">
        <div className="flex gap-24 xl:gap-5 md:flex-wrap xl:grid grid-cols-4">
          {PRODUCTS.map(p => (
            <div
              key={p.id}
              className="w-60 flex-shrink-0 rounded-xl relative"
            >
              <span className="absolute top-2 left-2 border-[0.1px] border-[#8C7367] rounded-full px-[16px] py-[4px] text-xs">
                {p.tag}
              </span>
              <button className="absolute top-2 right-2 text-gray-600 border-[0.1px] border-[#8C7367] rounded-full p-1 cursor-pointer">
                <HiOutlineShoppingBag size={20} />
              </button>

              <div className="">
                <div className="flex justify-center">
                  <img
                    src={p.image}
                    alt={p.title}
                    className="object-contain"
                  />
                </div>

                <div className="mt-4 flex justify-between items-end mb-6">
                  <div>
                    <p className="font-[lato] font-normal text-[16px] tracking-[0.5px]">{p.title}</p>
                    <p className="text-left font-[lato] font-normal text-[16px] tracking-[0.5px]">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-[lato] font-normal text-[12px] tracking-[0.5px] line-through text-[#2A3443]">
                      Rs.{p.original}/-
                    </p>
                    <p className="font-[lato] font-normal text-[16px] tracking-[0.5px]">
                      Rs.{p.price}/-
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* view all button */}
      <div className="w-full border-t border-[#C9B9AF] py-4 flex items-center justify-between text-[#9C7E6E] text-[16px] font-normal bg-[#FAF8F6]">
      <button className="ml-4 p-2 hover:opacity-70">
        <Left className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <span className="text-center flex-1 text-[16px]">
        Page {currentPage} of {totalPages}
      </span>

      <button className="mr-4 p-2 hover:opacity-70">
        <Right className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </div>    </section>
  );
}
