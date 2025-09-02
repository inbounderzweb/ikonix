import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

function PaymentLanding() {
  return (
    <div className="min-h-screen bg-[#F8F3F0] flex flex-col items-center justify-center px-4">
      {/* Exit button top-right */}
      <div className="absolute top-6 right-6">
        <button className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition">
          <XMarkIcon className="h-6 w-6 text-[#2A3443]" />
        </button>
      </div>

      {/* Heading */}
      <h1 className="text-3xl md:text-4xl font-bold text-[#8C7367] mb-10">
        Complete Payment
      </h1>

      {/* Razorpay logo / button */}
      <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center">
        <img
          src="https://razorpay.com/assets/razorpay-glyph.svg"
          alt="Razorpay"
          className="h-14 mb-6"
        />
       <Link to={'/'}>
       <button  className="px-8 py-3 bg-[#2A3443] text-white rounded-lg font-medium hover:opacity-90 transition">
          Exit
        </button>
       </Link> 
      </div>
    </div>
  );
}

export default PaymentLanding;
