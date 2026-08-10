import React from "react";
import AppRoutes from "./routes/AppRoutes"; // or your routing component
import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/Footer/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import WhatsAppWidget from "./components/WhatsAppWidget/WhatsAppWidget";
import { Toaster } from "react-hot-toast";
import usePageViewTracking from "./hooks/usePageViewTracking";

// Thin wrapper so the route-change tracking hook (useLocation) runs inside
// <BrowserRouter>, where App() itself is not.
function PageViewTracker() {
  usePageViewTracking();
  return null;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <PageViewTracker />
          <div className="pt-[54px] md:pt-[82px]"> {/* Adjust based on header height */}
            <Header />
          </div>
          <AppRoutes />
          <Footer />
          <WhatsAppWidget />
          {/*
            react-hot-toast only supports one mounted <Toaster/>; mounting a
            second one would render every toast twice. So: large screens use
            top-center (below) as the default, and utils/toast.js overrides
            `position` to bottom-right per toast call on screens < 768px —
            functionally identical to switching between the two configs.
          */}
          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={10}
            containerStyle={{ top: 100, bottom: 90, right: 16 }}
            toastOptions={{ duration: 2500 }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
