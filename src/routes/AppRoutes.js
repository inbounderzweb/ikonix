import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home/Home";
import Shop from "../pages/Home/shop/Shop";
import ProductDetail from "../pages/Home/productdetail/ProductDetail";
import CheckoutPage from "../pages/Home/checkout/CheckoutPage";
import ContactPage from "../pages/ContactPage/ContactPage";
import AboutUs from "../pages/AboutPage/AboutUs";
import AppLayout from "../Layout/AppLayout";
import UserProfile from "../pages/userprofile/UserProfile";



const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/product-details" element={<ProductDetail />}/>
      <Route path='/checkout' element={<CheckoutPage />} />
      <Route path='/contact' element={<ContactPage />} />
      <Route path='/about' element={<AboutUs />}/>
      <Route path='/profile' element={<UserProfile />} />
    </Routes>
  );
};

export default AppRoutes;
