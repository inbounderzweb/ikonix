import React from "react";
import { FaFacebookF, FaInstagram, FaXTwitter } from "react-icons/fa6";
import footerlogo from '../../assets/footerlogo.svg';

function Footer() {
  return (
    <footer className="bg-[#F9F6F4] text-[#7E675F] py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo */}
        <div>
          <img src={footerlogo} alt="Ikonix Logo" className="h-8 mb-4" />
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Contact Info</h4>
          <ul className="space-y-2">
            <li>Kammanahalli</li>
            <li>Electronic City</li>
            <li>Indiranagar</li>
            <li>Commercial Street</li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Links</h4>
          <ul className="space-y-2">
            <li>About Us</li>
            <li>Products</li>
            <li>Blog</li>
            <li>Contact Us</li>
          </ul>
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Follow us</h4>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <FaFacebookF />
              <span>Facebook</span>
            </li>
            <li className="flex items-center gap-2">
              <FaInstagram />
              <span>Instagram</span>
            </li>
            <li className="flex items-center gap-2">
              <FaXTwitter />
              <span>X.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#E0D6CF] mt-8 pt-4 flex flex-col md:flex-row items-center justify-between text-sm w-[75%] mx-auto">
        <p>
          Copyright © 2025 &nbsp; | &nbsp; Ikonix Perfume &nbsp; | &nbsp; All Rights Reserved
        </p>
        <div className="flex gap-4 mt-2 md:mt-0">
          <a href="#" className="hover:underline">Terms & Conditions</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
