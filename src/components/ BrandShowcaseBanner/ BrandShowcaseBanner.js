import desktopBanner from "../../assets/BrandShowcaseBanner/BrandShowcaseBanner.svg";
import mobileBanner from "../../assets/BrandShowcaseBanner/BrandShowcaseBanner_mobile copy.svg";

const BrandShowcaseBanner = () => {
  return (
    <section className="w-full">
      <div className="mx-auto">
        {/* Desktop */}
        <img
          src={desktopBanner}
          alt="Brand Banner"
          className="hidden md:block w-full object-cover"
        />

        {/* Mobile */}
        <img
          src={mobileBanner}
          alt="Brand Banner"
          className="block md:hidden w-full object-cover"
        />
      </div>
    </section>
  );
};

export default BrandShowcaseBanner;