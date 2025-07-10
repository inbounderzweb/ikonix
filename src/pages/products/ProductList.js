import React from 'react';
import { useGetProductsQuery } from '../../features/product/productApi';

export default function ProductList() {
  const { data, isLoading, isError } = useGetProductsQuery();

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Something went wrong.</p>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {data?.data?.map((product) => (
        <div key={product.id} className="p-4 border rounded shadow">
          <h3 className="font-bold">{product.name}</h3>
          <p>{product.description}</p>
        </div>
      ))}
    </div>
  );
}
