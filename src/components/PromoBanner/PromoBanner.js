import React from "react";

import desktopBanner from "../../assets/promo-banner.svg";

const BrandBanner = () => {
  return (
    <section className="w-full">
      <div className="mx-auto w-[100%]">

        {/* Desktop Banner */}
        <img
          src={desktopBanner}
          alt="Ikonix Perfume Banner"
        //   className="hidden md:block w-full object-cover"
                  className="object-cover w-full"
          loading="lazy"
        />

        {/* Mobile Banner */}
        {/* <img
          src={promo}
          alt="Ikonix Perfume Banner"
          className="block md:hidden w-full rounded-[20px] object-cover"
          loading="lazy"
        /> */}

      </div>
    </section>
  );
};

export default BrandBanner;