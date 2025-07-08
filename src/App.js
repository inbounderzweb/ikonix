import React from "react";
import AppRoutes from "./routes/AppRoutes"; // or your routing component
import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/Footer/Footer";
import ValidateOnLoad from "./lib/keyService";


function App() {
  return (
    <BrowserRouter>
<ValidateOnLoad/>

<div className="pt-[90px]"> {/* Adjust based on header height */}
  <Header />
  {/* rest of your content */}
</div>
          <AppRoutes />
    <Footer />
  
  
    </BrowserRouter>
   
  );
}

export default App;
