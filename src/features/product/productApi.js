// src/services/productApi.js
import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { ensureTokenReady } from '../../api/client';

// 1️⃣ Create your raw baseQuery
const rawBaseQuery = fetchBaseQuery({
  baseUrl: 'https://ikonixperfumer.com/beta/api/',
  prepareHeaders: async (headers) => {
    const token = await ensureTokenReady();
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

    // Server-side search: method is POST, but search/page/limit travel as
    // URL query params (`params`) so the backend reads them via req.query.
    searchProducts: builder.query({
      query: ({ search, page = 1, limit = 10 }) => ({
        url: 'products',
        method: 'POST',
        params: { search, page, limit },
      }),
    }),
  }),
});

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useSearchProductsQuery,
  useLazySearchProductsQuery,
} = productApi;
