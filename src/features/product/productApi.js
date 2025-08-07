import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const fetchAuthToken = () => localStorage.getItem('authToken');

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ikonixperfumer.com/beta/api/',
    prepareHeaders: (headers) => {
      const token = fetchAuthToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: () => 'products',
    }),
  }),
});

export const { useGetProductsQuery } = productApi;
