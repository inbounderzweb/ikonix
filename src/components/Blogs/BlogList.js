import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


import React from "react";
import Slider from "react-slick";
import blimg1 from '../../assets/blimg1.svg';
import blimg2 from '../../assets/blimg2.svg';
import blimg3 from '../../assets/blimg3.svg';

const blogs = [
  {
    id: 1,
    image: blimg1,
    title: "Create your own perfume Create your own perfume",
    description: "The path to a solid digital presence is insufficient without the..."
  },
  {
    id: 2,
    image: blimg2,
    title: "Create your own perfume Create your own perfume",
    description: "The path to a solid digital presence is insufficient without the..."
  },
  {
    id: 3,
    image: blimg3,
    title: "Create your own perfume Create your own perfume",
    description: "The path to a solid digital presence is insufficient without the..."
  },
];

// Slider settings for mobile
const sliderSettings = {
  dots: true,
  arrows: false,
  infinite: false,
  speed: 500,
  slidesToShow: 1.2, // show 1 full and partial next
  slidesToScroll: 1,
  responsive: [
    {
      breakpoint: 1024, // Mobile mode
      settings: {
        slidesToShow: 1.2,
        dots: true,
        arrows: false,
        infinite: false,
      }
    }
  ]
};

function BlogList() {
  return (
    <div className="w-full bg-white">
      <div className="lg:py-12 py-0">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl tracking-[0.5px] text-center mb-10 text-[#B39384] font-[luxia]">
            Blogs
          </h2>

          {/* Desktop Grid */}
          <div className="hidden md:grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-60 object-cover"
                />
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-[#EDE2DD] text-[#53443D] text-xs font-[lato] rounded-full">
                      Events
                    </span>
                    <span className="px-3 py-1 bg-[#EDE2DD] text-[#53443D] font-[lato] text-xs rounded-full">
                      WordPress
                    </span>
                  </div>
                  <h3 className="text-[#53443D] font-[lato] text-[20px] tracking-[0.5px] leading-[150%] text-left">
                    {blog.title}
                  </h3>
                  <p className="text-[16px] text-[#53443D] font-[lato] tracking-[0.5px] leading-[150%] text-left">{blog.description}</p>
                  <div className="border-t border-[#DDD] mt-auto" />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Slider */}
          <div className="md:hidden px-1 -ml-3">
            <Slider {...sliderSettings}>
              {blogs.map((blog) => (
                <div key={blog.id} className="pr-4">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="w-full h-60 object-cover"
                    />
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-[#EDE2DD] text-[#53443D] text-xs font-[lato] rounded-full">
                          Events
                        </span>
                        <span className="px-3 py-1 bg-[#EDE2DD] text-[#53443D] font-[lato] text-xs rounded-full">
                          WordPress
                        </span>
                      </div>
                      <h3 className="text-[#53443D] font-[lato] text-[20px] tracking-[0.5px] leading-[150%] text-left">
                        {blog.title}
                      </h3>
                      <p className="text-[16px] text-[#53443D] font-[lato] tracking-[0.5px] leading-[150%] text-left">{blog.description}</p>
                      <div className="border-t border-[#DDD] mt-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>

          {/* Button */}
          <div className="flex justify-center mt-10">
            <button className="px-6 py-2 bg-[#C5A291] text-[#13181F] rounded-full text-[16px] tracking-[0.5px] leading-[150%] font-[lato] transition">
              View all Blogs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogList;
