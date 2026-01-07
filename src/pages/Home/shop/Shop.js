// src/pages/shop/Shop.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import qs from "qs";

import bag from "../../../assets/bag.svg";
import Spinner from "../../../components/loader/Spinner";

import shopherobg from "../../../assets/shopherobg.svg";
import shopherobgmob from "../../../assets/shopheromobbg.svg";
import ValidateOnLoad from "../../../components/ValidateOnLoad";

import { useGetProductsQuery } from "../../../features/product/productApi";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";

const API_BASE = "https://ikonixperfumer.com/beta/api";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

export default function Shop() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, token, isTokenReady } = useAuth();
  const { refresh, addOrIncLocal } = useCart();

  // products fetch
  const { data, isLoading, isError, refetch } = useGetProductsQuery(undefined, {
    skip: !isTokenReady,
  });

  useEffect(() => {
    if (isTokenReady) refetch();
  }, [isTokenReady, refetch]);

  const products = data?.data || [];

  // ✅ Tabs are fixed, no duplicates
  const tabs = useMemo(() => ["All", "Men", "Women", "Best Sellers"], []);

  // ✅ internal selected tab state
  const [selectedTab, setSelectedTab] = useState("All");

  // ✅ apply default tab from Header/Home navigation state
  useEffect(() => {
    const filter = location.state?.activeFilter; // "men" | "women" | "bestSellers" | "all"
    if (!filter) return;

    if (filter === "men") setSelectedTab("Men");
    else if (filter === "women") setSelectedTab("Women");
    else if (filter === "bestSellers") setSelectedTab("Best Sellers");
    else setSelectedTab("All");

    // ✅ prevent it from re-applying on back/forward or re-render
    // clear the state after using it
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ✅ Filtered products based on selected tab
  const filtered = useMemo(() => {
    if (selectedTab === "All") return products;

    if (selectedTab === "Men") {
      return products.filter((p) => {
        const c = norm(p.category_name);
        return c.includes("men") || c.includes("mens");
      });
    }

    if (selectedTab === "Women") {
      return products.filter((p) => {
        const c = norm(p.category_name);
        return c.includes("women") || c.includes("womens") || c.includes("ladies");
      });
    }

    // Best sellers: replace with real condition if your API provides a flag.
    if (selectedTab === "Best Sellers") {
      return products; // fallback
    }

    return products;
  }, [selectedTab, products]);

  // ✅ Add to cart (optimistic + refresh)
  const handleAddToCart = useCallback(
    async (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? "";
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      if (!token || !user) {
        alert("Please login to add to cart");
        return;
      }

      addOrIncLocal(
        { id: product.id, variantid, name: product.name, image: product.image, price, qty: 1 },
        1
      );

      try {
        await axios.post(
          `${API_BASE}/cart`,
          qs.stringify({
            userid: user.id,
            productid: product.id,
            variantid,
            qty: 1,
          }),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        refresh();
      } catch (err) {
        console.error("Add to cart failed:", err?.response?.data || err);
        refresh(); // rollback by fetch
      }
    },
    [token, user, addOrIncLocal, refresh]
  );

  if (isLoading) {
    return (
      <p className="text-center py-8">
        <Spinner />
      </p>
    );
  }

  if (isError) return <p className="text-center py-8">Error loading products..</p>;

  return (
    <>
      <ValidateOnLoad />

      {/* Hero */}
      <div
        className="h-[242px] hidden md:flex w-[90%] xl:w-[75%] mx-auto bg-center bg-cover justify-end mt-6"
        style={{ backgroundImage: `url(${shopherobg})` }}
      />
      <div
        className="h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center mt-6"
        style={{ backgroundImage: `url(${shopherobgmob})` }}
      />

      <section className="mx-auto w-[90%] md:w-[75%] py-8">
        {/* ✅ Tabs */}
        <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTab(t)}
              className={`
                px-4 py-2 rounded-full flex-shrink-0 transition
                ${selectedTab === t ? "bg-[#b49d91] text-white" : "bg-white text-[#b49d91] border border-[#b49d91]"}
              `}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="flex flex-row gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {filtered.map((product) => {
            const variant = product.variants?.[0] || {};
            const vid = variant.vid ?? "";
            const msrp = Number(variant.price) || 0;
            const sale = Number(variant.sale_price) || msrp;

            return (
              <div
                key={`${product.id}-${vid}`}
                className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
              >
                <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
                  {product.category_name}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 rounded-full p-1"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                <img
                  onClick={() => navigate(`/product-details/${product.id}?vid=${vid}`)}
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-72 object-cover cursor-pointer"
                />

                <div className="pt-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[#2A3443] font-[Lato] text-[14px]">{product.category_name}</p>
                  </div>

                  <div className="text-right">
                    {sale < msrp && (
                      <span className="text-xs line-through text-[#2A3443] font-[Lato] block">
                        ₹{msrp}/-
                      </span>
                    )}
                    <span className="font-semibold text-[#2A3443]">₹{sale}/-</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
