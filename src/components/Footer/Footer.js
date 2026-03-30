import React from "react";
import { FaFacebookF, FaInstagram, FaXTwitter } from "react-icons/fa6";
import footerlogo from '../../assets/footerlogo.svg';
import { useNavigate } from "react-router-dom";

function Footer() {
  const Navigate = useNavigate();
  return (
    <footer className="bg-[#EDE2DD] text-[#7E675F] py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo */}
        <div>
          <img src={footerlogo} alt="Ikonix Logo" className="h-8 mb-4" />
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Contact Info</h4>
          <ul className="space-y-2">
            <a href="https://www.google.com/maps/dir//IKONIX+PERFUMER-Kammanahalli,+MARIYAPPA+CIRCLE,+CMR+Main+Rd,+HRBR+Layout+3rd+Block,+HRBR+Layout,+Kalyan+Nagar,+Bengaluru,+Karnataka+560043/@13.0940497,77.6208384,14z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bae178d1e020821:0xf6dfdd2e56290556!2m2!1d77.6370053!2d13.0229277?entry=ttu&g_ep=EgoyMDI2MDIyNS4wIKXMDSoASAFQAw%3D%3D">
              <li>Kammanahalli</li>
            </a>
            <a href="https://www.google.com/maps?sca_esv=cb0b2358a0071c17&sxsrf=ANbL-n7XGWoO4rwaM7pWHlOzrrb1DVHHdg:1772541650518&biw=1680&bih=928&uact=5&gs_lp=Egxnd3Mtd2l6LXNlcnAiIEVsZWN0dHJvbmljIGNpdHkgaWtvbml4IHBlcmZ1bWVyMggQABgIGA0YHjIIEAAYCBgNGB4yCBAAGAgYDRgeMggQABiABBiiBDIIEAAYgAQYogQyCBAAGIAEGKIEMgUQABjvBTIIEAAYgAQYogRI_jJQ5wdY0S9wAngBkAEBmAGaAqAB6RGqAQYwLjE1LjG4AQPIAQD4AQGYAgqgAtgIwgIKEAAYsAMY1gQYR8ICDRAAGLADGNYEGEcYyQPCAggQABgHGAgYHsICCxAAGIAEGIYDGIoFwgIKEAAYCBgKGA0YHpgDAIgGAZAGCJIHAzIuOKAH2GGyBwMwLji4B8wIwgcFMC41LjXIBx-ACAA&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KdPmIjYAa647Me9gw-4-qlbH&daddr=circle,opposite+to+Max+,neeladri+Nagar,+electronic+city,+Karuna+Nagar,+Electronic+City+Phase+I,+Doddathoguru,+Bengaluru,+Karnataka+560100">
              <li>Electronic City</li>
            </a>
            <a href="https://www.google.com/maps?sca_esv=cb0b2358a0071c17&biw=1680&bih=928&sxsrf=ANbL-n6I7kAUxaOCGtZyri0jBz-gpecvjA:1772541835227&gs_lp=Egxnd3Mtd2l6LXNlcnAiIEluZGlyYW5hZ2FyIGNpdHkgaWtvbml4IHBlcmZ1bWVyMggQABiABBiiBDIFEAAY7wUyBRAAGO8FMggQABiABBiiBEidElD0BVj0BXACeAGQAQCYAZUBoAGVAaoBAzAuMbgBDMgBAPgBAvgBAZgCA6ACpwHCAgoQABiwAxjWBBhHwgINEAAYsAMY1gQYRxjJA5gDAOIDBRIBMSBAiAYBkAYIkgcDMi4xoAeHA7IHAzAuMbgHmQHCBwUwLjEuMsgHDoAIAA&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KSmjGe66F647MWbxDvvgSSiz&daddr=198,+Manjunatha+Complex,+Chinmaya+Mission+Hospital+Rd,+Indira+Nagar+II+Stage,+Hoysala+Nagar,+Indiranagar,+Bengaluru,+Karnataka+560038">
              <li>Indiranagar</li>
            </a>
            <a href="https://www.google.com/maps?sca_esv=cb0b2358a0071c17&biw=1680&bih=928&sxsrf=ANbL-n4T3DA4RL_KwjOE8S4j-YeeamLIJw:1772541862757&uact=5&gs_lp=Egxnd3Mtd2l6LXNlcnAiIUNvbW1lcmNpYWwgU3RyZWV0IGlrb25peCBwZXJmdW1lcjIGEAAYCBgeMggQABgIGAoYHjICECYyCxAAGIAEGIYDGIoFMgsQABiABBiGAxiKBTILEAAYgAQYhgMYigUyCBAAGIAEGKIESJoIUABYAHAAeACQAQCYAY0BoAGNAaoBAzAuMbgBA8gBAPgBAvgBAZgCAaACkwGYAwCSBwMwLjGgB8kFsgcDMC4xuAeTAcIHAzItMcgHBIAIAA&um=1&ie=UTF-8&fb=1&gl=in&sa=X&geocode=KXl8W38AF647Mb8cqO_yfybJ&daddr=74,+Kamaraj+Rd,+Tasker+Town,+Sampangi+Rama+Nagar,+Bengaluru,+Karnataka+560042">
              <li>Commercial Street</li>
            </a>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Links</h4>
          <ul className="space-y-2">
            <li className="cursor-pointer" onClick={() => Navigate(`/about`)}>About Us</li>
            <li className="cursor-pointer" onClick={() => Navigate(`/shop`)}>Products</li>
            {/* <li className="cursor-pointer" onClick={() => Navigate(`/`)}>Blog</li> */}
            <li className="cursor-pointer" onClick={() => Navigate(`/contact`)}>Contact Us</li>
          </ul>
        </div>

        {/* Social Links */}
        <div>
          <h4 className="text-[#BFA290] font-medium mb-4">Follow us</h4>
          <ul className="space-y-3">

            <a href="https://www.facebook.com/p/Ikonix-Perfumer-100091090007818/" target="blank" rel="noopener noreferrer">
              <li className="flex items-center gap-3 cursor-pointer">
                <FaFacebookF />
                <span>Facebook</span>
              </li>
            </a>


            <a href="https://www.instagram.com/ikonix_perfumer/?hl=en" target="blank" rel="noopener noreferrer">

              <li className="flex items-center gap-3 cursor-pointer">
                <FaInstagram />
                <span>Instagram</span>
              </li>
            </a>

            {/* <a href="https://www.instagram.com/ikonix_perfumer/?hl=en" target="blank" rel="noopener noreferrer">
              <li className="flex items-center gap-3 cursor-pointer">
                <FaXTwitter />
                <span>X.com</span>
              </li>
            </a> */}



          </ul>
        </div>
      </div>

      <div className="border-t border-[#E0D6CF] mt-8 pt-4 flex flex-col md:flex-row items-center justify-between text-sm w-[75%] mx-auto">
        <p>
          Copyright © 2026 &nbsp; | &nbsp; Ikonix Perfumer &nbsp; | &nbsp; All Rights Reserved
        </p>
        <div className="flex gap-4 mt-2 md:mt-0">
          <p>Terms & Conditions</p>
          <p>Privacy Policy</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
