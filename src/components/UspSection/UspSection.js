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
      <section className="grid xl:flex justify-start md:justify-center md:space-x-6 md:p-4 md:w-[90%] space-x-2 p-2 w-[90%] lg:w-[80%] mx-auto">


        {usps.map(({ id, icon, title, copy }) => (
          <div key={id} className="flex items-center space-x-4 m-[10px] border-b-[1px] md:border-r-[1px] md:border-b-[0px] last:border-b-0 md:last:border-r-0 border-[#B39384] p-2">
            <div className="flex h-20 w-20 md:h-24 md:w-24 flex-shrink-0 items-center justify-center rounded-full bg-[#b39384]">
              <img src={icon} alt="icon" className="w-10 md:w-12 object-contain" />
            </div>

            <div className="text-left">
              <span className="font-fancy block text-xl font-bold">{title}</span>
              <p className="font-fancy text-sm text-gray-700 mt-2">{copy}</p>
            </div>
          </div>
        ))}


      </section>
    </div>

  );
}
