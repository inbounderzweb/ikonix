import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// 🔐 Utility to fetch token from localStorage
const fetchAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const productApi = createApi({
  reducerPath: 'productApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ikonixperfumer.com/beta/api/',
    prepareHeaders: (headers) => {
      const token = fetchAuthToken();

      // Set headers only if token exists
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),

  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products', // 🔗 Will call: https://ikonixperfumer.com/beta/api/products
    }),
  }),
});

// ✅ Hook for component usage
export const { useGetProductsQuery } = productApi;
