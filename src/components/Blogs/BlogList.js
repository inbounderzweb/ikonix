import React from "react";
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

function BlogList() {
  return (
    <div className="bg-[#F9F6F4] py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10 text-[#7E675F]">
          Blogs
        </h2>

        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  <span className="px-3 py-1 bg-[#EDE2DD] text-[#7E675F] text-xs rounded-full">
                    Events
                  </span>
                  <span className="px-3 py-1 bg-[#EDE2DD] text-[#7E675F] text-xs rounded-full">
                    WordPress
                  </span>
                </div>
                <h3 className="text-[#7E675F] font-semibold text-lg text-left">
                  {blog.title}
                </h3>
                <p className="text-sm text-[#7E675F] text-left">{blog.description}</p>
                <div className="border-t border-[#DDD] mt-auto" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button className="px-6 py-2 bg-[#BFA290] text-white rounded-full hover:bg-[#A38B7C] transition">
            View all Blogs
          </button>
        </div>
      </div>
    </div>
  );
}

export default BlogList;
