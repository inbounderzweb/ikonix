import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import qs from "qs";

const API_BASE = "https://ikonixperfumer.com/beta/api";

function AddresList() {
  const { user, token } = useAuth();
  const [address, setAddress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  // Edit modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (user?.id) {
      fetchAddress();
    }
  }, [user]);

  const fetchAddress = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_BASE}/address`,
        qs.stringify({ userid: user.id }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setAddress(response.data.data || []);
    } catch (err) {
      console.error("Error fetching address:", err);
      setError("Failed to load your addresses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Lazy load more on scroll
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 100 >=
      document.documentElement.scrollHeight
    ) {
      setVisibleCount((prev) => prev + 5);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Open edit modal
  const handleEdit = (addr) => {
    setSelectedAddress(addr);
    setFormData({ ...addr });
    setIsEditOpen(true);
  };

  // Handle form change
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Submit edit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
    const response =  await axios.post(
        `${API_BASE}/address/edit`,
        qs.stringify({
          userid: user.id,
          address_id: selectedAddress.address_id,
          doorno: formData.doorno,
          house: formData.house,
          street: formData.street,
          city: formData.city,
          pincode: formData.pincode,
          district: formData.district,
          state: formData.state,
          country: formData.country,
          company: formData.company,
          gst: formData.gst,
          type: formData.type,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setIsEditOpen(false);
      alert(response.data.message,'address edit response')
      fetchAddress(); // refresh addresses
    } catch (err) {
      console.error("Error editing address:", err);
      alert("Failed to update address. Please try again.");
    }
  };



const handleDelete = async (addr) => {
  try {
    const response = await axios.post(
      `${API_BASE}/address/delete`,
      qs.stringify({
        userid: user.id,
        address_id: addr.aid,   // use actual id here
      }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    alert(response.data.message || "Address deleted");
    fetchAddress(); // refresh addresses
  } catch (err) {
    console.error("Error deleting address:", err);
    alert("Failed to delete address. Please try again.");
  }
};






  return (
    <div className="w-[95%] lg:w-[75%] mx-auto px-4">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 mb-6">
        <Link to="/user-profile" className="hover:underline">
          Profile
        </Link>
        <span> / </span>
        <span className="text-gray-700">Address</span>
      </nav>

      {/* Address Section */}
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Saved Addresses</h2>

      {address.slice(0, visibleCount).map((addr, id) => (
        <div
          key={id}
          className="border p-5 mb-5 rounded-lg shadow-sm bg-white hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-lg font-semibold text-gray-800">
                Address ID: {addr.address_id}
              </p>
              <p className="text-sm text-gray-600">
                Door No: {addr.doorno}, House: {addr.house}, Street: {addr.street}
              </p>
              <p className="text-sm text-gray-600">
                City: {addr.city} - PIN: {addr.pincode}
              </p>
              <p className="text-sm text-gray-600">
                District: {addr.district} - State: {addr.state}
              </p>
              <p className="text-sm text-gray-600">
                Country: {addr.country} - Company: {addr.company}
              </p>
              <p className="text-sm text-gray-600">
                GST: {addr.gst}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(addr)}
                className="px-3 py-1 text-sm bg-gray-100 border rounded-md hover:bg-gray-200"
              >
                Edit
              </button>
              <button

  onClick={() => handleDelete(addr)} className="px-3 py-1 text-sm bg-red-100 border border-red-300 text-red-600 rounded-md hover:bg-red-200">
  Delete
</button>
            </div>
          </div>
        </div>
      ))}

      {/* States */}
      {loading && (
        <p className="text-gray-500 text-center mt-4">Loading your addresses...</p>
      )}
      {error && <p className="text-red-500 text-center">{error}</p>}
      {!loading && address.length === 0 && (
        <p className="text-gray-500 text-center">No addresses found.</p>
      )}

      {/* Edit Modal */}
    {/* Edit Modal */}
{isEditOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
    <div className="bg-[#FAF6F4] w-[98%] max-w-2xl p-4 rounded-2xl shadow-lg relative">
      
      {/* Close button */}
      <button
        type="button"
        onClick={() => setIsEditOpen(false)}
        className="absolute top-4 right-4 text-[#6C5950] hover:text-black"
      >
        ✕
      </button>

      {/* Heading */}
      <h2 className="text-2xl font-semibold text-[#6C5950] mb-6">
        Edit Address
      </h2>


      <hr className="border-[#B39384]/50 mb-6" />

      {/* Form */}
      <form onSubmit={handleSubmit} className="gap-2 grid grid-cols-2 items-center">

<div>

        <span className="text-[14px] font-[luxia] text-[#6C5950]">Door Num :</span>
        <input
          type="text"
          name="doorno"
          placeholder="Door No"
          value={formData.doorno || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">House :</span>
        <input
          type="text"
          name="house"
          placeholder="House"
          value={formData.house || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">Street :</span>
        <input
          type="text"
          name="street"
          placeholder="Street"
          value={formData.street || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none col-span-2 md:col-span-1"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">City :</span>
        <input
          type="text"
          name="city"
          placeholder="City"
          value={formData.city || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">Pincode :</span>
        <input
          type="text"
          name="pincode"
          placeholder="Pincode"
          value={formData.pincode || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
    
</div>

<div>
        <span className="text-[14px] font-[luxia] text-[#6C5950]">District :</span>
        <input
          type="text"
          name="district"
          placeholder="District"
          value={formData.district || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">State :</span>
        <input
          type="text"
          name="state"
          placeholder="State"
          value={formData.state || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">Country :</span>
        <input
          type="text"
          name="country"
          placeholder="Country"
          value={formData.country || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none"
        />
        <span className="text-[14px] font-[luxia] text-[#6C5950]">Company :</span>
        <input
          type="text"
          name="company"
          placeholder="Company"
          value={formData.company || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none col-span-2"
        />

        <span className="text-[14px] font-[luxia] text-[#6C5950]">Gst :</span>       
        <input
          type="text"
          name="gst"
          placeholder="GST"
          value={formData.gst || ""}
          onChange={handleChange}
          className="w-full border border-[#B39384] rounded-md px-3 py-2 placeholder-[#B39384] focus:outline-none col-span-2"
        />
</div>
        {/* Buttons */}
        <div className="col-span-2 flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setIsEditOpen(false)}
            className="px-6 py-3 border border-[#B39384] rounded-md text-[#6C5950] hover:bg-[#EDE2DD]"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-[#2A3443] text-white rounded-md hover:opacity-90"
          >
            Edit
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}

export default AddresList;
