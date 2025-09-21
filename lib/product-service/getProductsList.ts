import { products } from "./mock-data/products.js";

export async function handler() {
  return {
    body: JSON.stringify(products),
    statusCode: 200,
  };
}
