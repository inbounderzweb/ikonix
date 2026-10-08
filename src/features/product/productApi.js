// src/services/productApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { createApiClient } from '../../api/client';

const productClient = createApiClient({
  baseUrl: 'https://ikonixperfumer.com/beta/api/',
  getToken: () => null,
});

// Products and search use the same guest renewal as login and other API calls.
// Repeating a fetch with the same rejected JWT cannot recover authentication.
const baseQuery = async (args, queryApi) => {
  const { url, method = 'GET', body, ...options } = typeof args === 'string' ? { url: args } : args;
  try {
    const response = await productClient.request({
      ...options,
      url,
      method,
      data: body,
      signal: queryApi.signal,
    });
    return { data: response.data };
  } catch (error) {
    return {
      error: {
        status: error?.response?.status || 'FETCH_ERROR',
        data: error?.response?.data || { error: error.message },
      },
    };
  }
};

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery,
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products',
    }),

    // Server-side search: page/limit/search travel as multipart/form-data
    // fields in the POST body (confirmed against the Postman collection).
    // Axios leaves the multipart boundary to the browser for FormData bodies.
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
