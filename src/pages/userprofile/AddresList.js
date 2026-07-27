import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createApiClient } from "../../api/client";
import axios from "axios";
import qs from "qs";

const API_BASE = "https://ikonixperfumer.com/beta/api";

const ADDRESS_TYPES = ["Home", "Work", "Other"];
const REQUIRED_ADDRESS_FIELDS = ["street", "city", "pincode", "district", "state", "country"];

function validateAddressForm(data) {
  const errors = {};
  REQUIRED_ADDRESS_FIELDS.forEach((field) => {
    if (!String(data[field] || "").trim()) {
      errors[field] = "This field is required";
    }
  });
  if (data.pincode && !/^\d{4,10}$/.test(String(data.pincode).trim())) {
    errors.pincode = "Enter a valid pincode";
  }
  return errors;
}

function AddressField({ label, name, value, onChange, error, required, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-[#6C5950] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        name={name}
        placeholder={label}
        value={value || ""}
        onChange={onChange}
        className={`w-full border rounded-md px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B39384]/40 transition-colors ${
          error ? "border-red-400" : "border-[#B39384]"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function AddresList() {
  const { user, token, setToken, setIsTokenReady } = useAuth();

  // Shared client that auto-refreshes the API token on 401/403 — same one
  // the checkout page uses, so address requests don't fail on a stale token.
  const api = useMemo(
    () => createApiClient({ getToken: () => token, setToken, setIsTokenReady }),
    [token, setToken, setIsTokenReady]
  );

  const [address, setAddress] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);

  // Edit modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [formData, setFormData] = useState({});

  // Add modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({});
  const [addFormErrors, setAddFormErrors] = useState({});
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const fetchAddress = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post(
        `${API_BASE}/address`,
        qs.stringify({ userid: user.id }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setAddress(response.data.data || []);
    } catch (err) {
      console.error("Error fetching address:", err);
      if (err.response?.status === 404) {
        // Backend returns 404 when the user simply has no saved addresses yet —
        // that's not a failure, just an empty list.
        setAddress([]);
      } else {
        setError("Failed to load your addresses. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, api]);

  // Auto fetch on mount and whenever the logged-in user changes
  useEffect(() => {
    if (user?.id) {
      fetchAddress();
    }
  }, [user?.id, fetchAddress]);

  // Auto fetch again when the tab regains focus/visibility, so stale data
  // (e.g. an address added in another tab) doesn't linger — same pattern
  // the checkout page uses to keep its cart/address data fresh.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && user?.id) {
        fetchAddress();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user?.id, fetchAddress]);

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
    const response =  await api.post(
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
    const response = await api.post(
      `${API_BASE}/address/delete`,
      qs.stringify({
        userid: user.id,
        address_id: addr.aid,   // use actual id here
      }),
      {
        headers: {
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

  // Open add modal
  const handleOpenAdd = () => {
    setAddFormData({ type: "Home" });
    setAddFormErrors({});
    setLocationError("");
    setIsAddOpen(true);
  };

  // Auto fetch address from the browser's current location — same
  // reverse-geocode flow used on the checkout page's "Use my Location".
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by this browser");
      return;
    }
    setLocationError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
            params: { lat: latitude, lon: longitude, format: "json" },
          });
          const a = res.data.address || {};
          setAddFormData((prev) => ({
            ...prev,
            street: `${a.road || ""}${a.road && ","} ${a.suburb || ""}`.trim(),
            city: a.city || a.town || a.village || prev.city,
            district: a.county || prev.district,
            state: a.state || prev.state,
            country: a.country || prev.country,
            pincode: a.postcode || prev.pincode,
          }));
          setAddFormErrors({});
        } catch {
          setLocationError("Unable to fetch address from location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError("Permission denied or location unavailable");
        setLocating(false);
      }
    );
  };

  // Handle add form change
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({ ...prev, [name]: value }));
    setAddFormErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };

  // Submit add form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = validateAddressForm(addFormData);
    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }
    setAddSubmitting(true);
    try {
      const response = await api.post(
        `${API_BASE}/address/add`,
        qs.stringify({
          userid: user.id,
          doorno: addFormData.doorno,
          house: addFormData.house,
          street: addFormData.street,
          city: addFormData.city,
          pincode: addFormData.pincode,
          district: addFormData.district,
          state: addFormData.state,
          country: addFormData.country,
          company: addFormData.company,
          gst: addFormData.gst,
          type: addFormData.type,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setIsAddOpen(false);
      setAddFormData({});
      alert(response.data.message || "Address added");
      fetchAddress(); // refresh addresses
    } catch (err) {
      console.error("Error adding address:", err);
      alert("Failed to add address. Please try again.");
    } finally {
      setAddSubmitting(false);
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
      {!loading && !error && address.length > 0 && (
        <h2 className="text-xl font-semibold text-[#6d5a52] bg-[#eadcd5] px-4 py-2 rounded-md inline-block mb-4">
          Saved Addresses
        </h2>
      )}

      {!loading && !error && address.length > 0 && (
        <div className="space-y-4 mb-6">
          {address.slice(0, visibleCount).map((addr, id) => (
            <div
              key={id}
              className="border border-[#d7c6bfd7] rounded-2xl p-4 bg-[#f6ebe6] text-sm leading-snug text-[#6d5a52]"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-semibold mb-1">
                    Address ID: {addr.address_id} {addr.type && `• ${addr.type}`}
                  </p>
                  <p>
                    Door No: {addr.doorno}, House: {addr.house}, Street: {addr.street}
                  </p>
                  <p>
                    City: {addr.city} - PIN: {addr.pincode}
                  </p>
                  <p>
                    District: {addr.district} - State: {addr.state}
                  </p>
                  <p>
                    Country: {addr.country} - Company: {addr.company}
                  </p>
                  {addr.gst && <p>GST: {addr.gst}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="px-3 py-1 text-sm bg-white border border-[#b49d91] rounded-md hover:bg-[#eadcd5]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addr)}
                    className="px-3 py-1 text-sm bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleOpenAdd}
            className="w-full bg-[#eadcd5] text-[#6d5a52] py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90"
          >
            <span className="text-xl">+</span> Add New
          </button>
        </div>
      )}

      {/* States */}
      {loading && (
        <p className="text-gray-500 text-center mt-4">Loading your addresses...</p>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-[#d7c6bfd7] rounded-2xl bg-[#f6ebe6]">
          <svg
            className="w-14 h-14 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-8.25 3.75h.008v.008h-.008v-.008z"
            />
          </svg>
          <p className="text-[#6d5a52] font-medium">Failed to load your addresses</p>
          <p className="text-[#6d5a52]/70 text-sm mt-1">
            You can still add a new address below.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-6 w-full max-w-xs bg-[#eadcd5] text-[#6d5a52] py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90"
          >
            <span className="text-xl">+</span> Add Address
          </button>
        </div>
      )}

      {!loading && !error && address.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-[#d7c6bfd7] rounded-2xl bg-[#f6ebe6]">
          <svg
            className="w-14 h-14 text-[#b49d91] mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <p className="text-[#6d5a52] font-medium">No saved addresses yet</p>
          <p className="text-[#6d5a52]/70 text-sm mt-1">
            Addresses you save during checkout will show up here.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-6 w-full max-w-xs bg-[#eadcd5] text-[#6d5a52] py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90"
          >
            <span className="text-xl">+</span> Add New
          </button>
        </div>
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

      {/* Add Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
          onClick={() => !addSubmitting && setIsAddOpen(false)}
        >
          <div
            className="bg-[#FAF6F4] w-full max-w-2xl rounded-2xl shadow-xl relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#B39384]/30">
              <div>
                <h2 className="text-xl font-semibold text-[#6C5950]">Add New Address</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Fill in the details below to save a new delivery address.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#6C5950] hover:text-black text-xl leading-none shrink-0 ml-4"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              id="add-address-form"
              onSubmit={handleAddSubmit}
              className="overflow-y-auto px-6 py-5 flex-1"
            >
              {/* Auto fetch from current location */}
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locating}
                className="mb-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EDE2DD] text-[#6C5950] hover:opacity-90 disabled:opacity-60 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                {locating ? "Fetching location..." : "Use my Location"}
              </button>
              {locationError && (
                <p className="text-xs text-red-500 mb-3">{locationError}</p>
              )}

              <hr className="border-[#B39384]/30 mb-5" />

              {/* Address type */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-[#6C5950] mb-2">
                  Address Type
                </label>
                <div className="flex gap-2">
                  {ADDRESS_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddFormData((prev) => ({ ...prev, type: t }))}
                      className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                        addFormData.type === t
                          ? "bg-[#2A3443] text-white border-[#2A3443]"
                          : "border-[#B39384] text-[#6C5950] hover:bg-[#EDE2DD]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core address fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AddressField
                  label="Door No"
                  name="doorno"
                  value={addFormData.doorno}
                  onChange={handleAddChange}
                />
                <AddressField
                  label="House / Building"
                  name="house"
                  value={addFormData.house}
                  onChange={handleAddChange}
                />
                <AddressField
                  label="Street"
                  name="street"
                  value={addFormData.street}
                  onChange={handleAddChange}
                  error={addFormErrors.street}
                  required
                  className="sm:col-span-2"
                />
                <AddressField
                  label="City"
                  name="city"
                  value={addFormData.city}
                  onChange={handleAddChange}
                  error={addFormErrors.city}
                  required
                />
                <AddressField
                  label="Pincode"
                  name="pincode"
                  value={addFormData.pincode}
                  onChange={handleAddChange}
                  error={addFormErrors.pincode}
                  required
                />
                <AddressField
                  label="District"
                  name="district"
                  value={addFormData.district}
                  onChange={handleAddChange}
                  error={addFormErrors.district}
                  required
                />
                <AddressField
                  label="State"
                  name="state"
                  value={addFormData.state}
                  onChange={handleAddChange}
                  error={addFormErrors.state}
                  required
                />
                <AddressField
                  label="Country"
                  name="country"
                  value={addFormData.country}
                  onChange={handleAddChange}
                  error={addFormErrors.country}
                  required
                  className="sm:col-span-2"
                />
              </div>

              {/* Optional business details */}
              <div className="mt-6 pt-5 border-t border-[#B39384]/30">
                <p className="text-sm font-medium text-[#6C5950] mb-3">
                  Business Details <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AddressField
                    label="Company"
                    name="company"
                    value={addFormData.company}
                    onChange={handleAddChange}
                  />
                  <AddressField
                    label="GST Number"
                    name="gst"
                    value={addFormData.gst}
                    onChange={handleAddChange}
                  />
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex justify-between gap-3 px-6 py-4 border-t border-[#B39384]/30">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={addSubmitting}
                className="px-6 py-2.5 border border-[#B39384] rounded-md text-[#6C5950] hover:bg-[#EDE2DD] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-address-form"
                disabled={addSubmitting}
                className="px-6 py-2.5 bg-[#2A3443] text-white rounded-md hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {addSubmitting && (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {addSubmitting ? "Saving..." : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AddresList;
