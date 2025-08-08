// src/services/productApi.js
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';

// helper to grab latest token
const fetchAuthToken = () => localStorage.getItem('authToken');

// 1️⃣ Create your raw baseQuery
const rawBaseQuery = fetchBaseQuery({
  baseUrl: 'https://ikonixperfumer.com/beta/api/',
  prepareHeaders: (headers) => {
    const token = fetchAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// 2️⃣ Wrap it in a retry layer with maxRetries: 1 (so each call runs twice)
const baseQuery = retry(rawBaseQuery, { maxRetries: 1 });

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery,
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products',
      // no extra config needed – baseQuery will retry once automatically
    }),
  }),
});

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
} = productApi;
