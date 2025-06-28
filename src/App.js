import React from "react";
import AppRoutes from "./routes/AppRoutes"; // or your routing component
import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/Footer/Footer";

function App() {
  return (
    <BrowserRouter>
    <Header/>
          <AppRoutes />
    <Footer />
    </BrowserRouter>
   
  );
}

export default App;
