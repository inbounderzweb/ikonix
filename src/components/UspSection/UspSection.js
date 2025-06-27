import React from "react";
import icon from "../../assets/icon.svg"; // Update path if needed

export default function UspSection() {
  const usps = [
    {
      id: 1,
      icon,
      title: "USP 1",
      copy: "Lorem ipsum dolor sit amet, consectetuer adipiscing.",
    },
    {
      id: 2,
      icon,
      title: "USP 2",
      copy: "Lorem ipsum dolor sit amet, consectetuer adipiscing.",
    },
    {
      id: 3,
      icon,
      title: "USP 3",
      copy: "Lorem ipsum dolor sit amet, consectetuer adipiscing.",
    },
  ];

  return (


    <div className="bg-[#e8d5cf] w-full">
    <section className="grid md:flex justify-start md:justify-center md:space-x-6 md:p-4 md:w-[75%] space-x-2 p-2 w-[95%] mx-auto">

      
{usps.map(({ id, icon, title, copy }) => (
  <div key={id} className="flex items-start space-x-4 border-r-[1px] border-black">
    <img src={icon} alt="icon" className="w-24 h-24" />
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
