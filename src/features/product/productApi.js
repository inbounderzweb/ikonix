// src/services/productApi.js
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { ensureGuestTokenReady } from '../../api/client';

// 1️⃣ Create your raw baseQuery
const rawBaseQuery = fetchBaseQuery({
  baseUrl: 'https://ikonixperfumer.com/beta/api/',
  prepareHeaders: async (headers) => {
    const token = await ensureGuestTokenReady();
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

    // Server-side search: page/limit/search travel as multipart/form-data
    // fields in the POST body (confirmed against the Postman collection).
    // fetchBaseQuery detects the FormData body, drops the forced
    // 'application/json' Content-Type, and lets fetch set the correct
    // 'multipart/form-data; boundary=...' header itself.
    searchProducts: builder.query({
      query: ({ search, page = 1, limit = 10 }) => {
        const formData = new FormData();
        formData.append('page', page);
        formData.append('limit', limit);
        formData.append('search', search);
        return {
          url: 'products',
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useSearchProductsQuery,
  useLazySearchProductsQuery,
} = productApi;
