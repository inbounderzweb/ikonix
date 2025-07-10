import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// 🔐 Fetch token from localStorage just like in fetchToken()
const fetchAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const productApi = createApi({
  reducerPath: 'productApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ikonixperfumer.com/beta/api/',
    prepareHeaders: (headers) => {
      const token = fetchAuthToken(); // ✅ get token like fetchToken()

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),

  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products', // No payload needed
    }),
  }),
});

export const { useGetProductsQuery } = productApi;
