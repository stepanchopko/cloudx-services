import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { products } from "./mock-data/products.js";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing productId in path parameters" }),
    };
  }

  const product = products.find(({ id }) => id === productId);

  if (!product) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: `Product with ID ${productId} not found` }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(product),
  };
}
