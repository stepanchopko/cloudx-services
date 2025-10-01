import { products } from "./mock-data/products.js";
import { HEADERS } from "./constants.js";

export async function handler() {
  return {
    body: JSON.stringify(products),
    statusCode: 200,
    headers: HEADERS,
  };
}
