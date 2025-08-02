// features/product/productApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// 🔐 Utility to fetch token from localStorage
const fetchAuthToken = () => localStorage.getItem('authToken');

export const productApi = createApi({
  reducerPath: 'productApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ikonixperfumer.com/beta/api/',
    prepareHeaders: (headers) => {
      const token = fetchAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),

  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products', // 🔗 GET https://ikonixperfumer.com/beta/api/products
    }),
  }),
});

export const { useGetProductsQuery } = productApi;
