import React from "react";
import uspic1 from "../../assets/uspi1.png";
import uspic2 from "../../assets/uspi2.png";
import uspic3 from "../../assets/uspi3.png";

export default function UspSection() {
  const usps = [
    {
      id: 1,
      icon: uspic1,
      title: "Finest Imported Ingredients",
      copy: "We source high-quality essential oils and rare fragrance extracts from around the world to ensure long-lasting, luxurious perfumes with exceptional depth and character.",
    },
    {
      id: 2,
      icon: uspic3,
      title: "Artisan Perfume Blending",
      copy: "Our master perfumers carefully craft each fragrance using precise blending techniques to create balanced, refined, and unforgettable scent compositions.",
    },
    {
      id: 3,
      icon: uspic2,
      title: "All-Day Lasting Fragrance",
      copy: "Experience powerful, long-lasting perfumes designed to stay vibrant from morning to night without fading, ensuring confidence in every moment.",
    },
  ];

  return (


    <div className="bg-[#e8d5cf] w-full">
      <section className="grid xl:flex justify-start md:justify-center md:space-x-6 md:p-4 md:w-[80%] space-x-2 p-2 w-[95%] mx-auto">


        {usps.map(({ id, icon, title, copy }) => (
          <div key={id} className="flex items-start space-x-4 m-[10px] border-b-[1px] md:border-r-[1px] md:border-b-[0px] border-[#B39384] p-2">
            <div className="p-2 rounded-full bg-[#b39384]">
              <img src={icon} alt="icon" className="w-24" />
            </div>

            <div className="text-left">
              <span className="block text-xl font-bold">{title}</span>
              <p className="text-sm text-gray-700 mt-2">{copy}</p>
            </div>
          </div>
        ))}


      </section>
    </div>

  );
}
