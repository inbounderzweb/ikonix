import React, { useState, useMemo, useEffect } from 'react';
import shopherobg from '../../../assets/shopherobg.svg';
import shopherobgmob from '../../../assets/shopheromobbg.svg';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume from '../../../components/ownperfume/OwnPerfume';
import { useGetProductsQuery } from '../../../features/product/productApi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import qs from 'qs';

function Shop() {
  const { data, isLoading, isError } = useGetProductsQuery();
  const [visibleCount, setVisibleCount] = useState(12);
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const products = useMemo(() => data?.data || [], [data]);

  // Lazy load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200
      ) {
        setVisibleCount((prev) => prev + 6);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBookNow = (product) => {
    navigate('/product-details', { state: { product } });
  };

  const handleAddToCart = async (product) => {
    if (!token || !user) {
      alert('User not logged in or token missing.');
      return;
    }

    try {
      const response = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({
          userid: user.id,
          productid: product.id,
          qty: 1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
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

  return (
    <div>
      {/* Hero section for desktop */}
      <div
        className='h-[242px] hidden md:flex w-[90%]  xl:w-[75%] mx-auto bg-center bg-cover justify-end bg-no-repeat mt-[24px]'
        style={{ backgroundImage: `url(${shopherobg})` }}
      >
        <span className='font-[luxia] text-[#53443D] text-[36px] leading-[112.5%] tracking-[0.5px] flex  align-middle items-center lg:mr-[80px] xl:mr-[200px]'>
          Lorem Ipsum <br /> dolor sit amet
        </span>
      </div>

      {/* Hero section for mobile */}
      <div
        className='h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center bg-no-repeat mt-[24px]'
        style={{ backgroundImage: `url(${shopherobgmob})` }}
      >
        <p className='text-center mt-[24px] font-[luxia] font-[400] text-[27px] tracking-[0.5px]'>
          Lorem Ipsum <br /> dolor sit amet
        </p>
      </div>

      {/* Product section */}
      <section className="mx-auto w-[90%] my-10">
        {isLoading ? (
          <p>Loading...</p>
        ) : isError ? (
          <p>Something went wrong.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.slice(0, visibleCount).map((product) => (
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
        )}
      </section>

      <SpecialDealsSlider />
      <OwnPerfume />
    </div>
  );
}

export default Shop;