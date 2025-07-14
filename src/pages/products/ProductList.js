import React, { useState, useMemo } from 'react';
import { useGetProductsQuery } from '../../features/product/productApi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import qs from 'qs'; // ✅ IMPORTANT for form-urlencoded

export default function ProductList() {
  const { data, isLoading, isError } = useGetProductsQuery();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const products = data?.data || [];

  const categoryList = useMemo(() => {
    const categories = products.map((p) => p.category_name);
    return [...new Set(categories)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return selectedCategory
      ? products.filter((p) => p.category_name === selectedCategory)
      : products;
  }, [selectedCategory, products]);

  const handleBookNow = (product) => {
    navigate('/product-details', { state: { product } });
  };

  const handleAddToCart = async (product) => {
    if (!token || !user) {
      alert('User not logged in or token missing.');
      return;
    }

    const AddToCartUrl = 'https://ikonixperfumer.com/beta/api/cart';

    try {
      const response = await axios.post(
        AddToCartUrl,
        qs.stringify({
          userid: user.id,
          productid: product.id,
          qty: 1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded', // ✅ Must match your backend
          },
        }
      );

      if (response.data.success) {
        alert(`${product.name} added to cart`);
      } else {
        alert(response.data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error("❌ Error adding to cart:", error?.response?.data || error.message);
      alert('Error adding to cart. See console for details.');
    }
  };

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Something went wrong.</p>;

  return (
    <section className="mx-auto w-[90%]">
      <div className="flex gap-3 mb-6 overflow-x-auto">
        {categoryList.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full border ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full border ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="border rounded shadow p-4">
            <img
              src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
              alt={product.name}
              className="mb-3 w-full h-48 object-cover rounded"
            />
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-1">{product.description}</p>
            <p className="text-xs text-gray-400">{product.category_name}</p>

            <div className="mt-4 flex gap-2">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded w-full"
                onClick={() => handleBookNow(product)}
              >
                Book Now
              </button>
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded w-full"
                onClick={() => handleAddToCart(product)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
